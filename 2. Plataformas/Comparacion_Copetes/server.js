const express = require('express');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const defaults = require('./config/defaults');
const log = require('./logger');

const app = express();
const PORT = defaults.PORT;
const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'prices.json');
const HISTORY_DIR = path.join(CACHE_DIR, 'history');
const CONFIG_FILE = path.join(__dirname, 'config.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { enabledStores: null, enabledProducts: null };
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return { enabledStores: null, enabledProducts: null }; }
}

// Estado global del scraping
let scrapeStatus = {
  running: false,
  progress: 0,
  currentStore: '',
  currentProduct: '',
  startTime: null,
  lastRun: null,
  lastRunDuration: null,
  error: null,
  stats: { found: 0, notFound: 0, errors: 0 },
};

app.use(express.json());
app.use(express.static(__dirname));

// ── MIDDLEWARE: autenticación para endpoints de escritura ──
const API_SECRET = process.env.COPETON_SECRET || 'copeton-local-2025';
function requireAuth(req, res, next) {
  const token = req.headers['x-api-key'] || req.query.key;
  if (token && token !== API_SECRET) {
    return res.status(401).json({ success: false, message: 'API key inválida' });
  }
  next();
}

// ── MIDDLEWARE: rate limiting para scrape ──────────────────
const rateMap = {};
function rateLimit(maxPerMinute) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    if (!rateMap[key]) rateMap[key] = [];
    rateMap[key] = rateMap[key].filter(t => now - t < 60000);
    if (rateMap[key].length >= maxPerMinute) {
      return res.status(429).json({ success: false, message: 'Demasiadas solicitudes. Espera un momento.' });
    }
    rateMap[key].push(now);
    next();
  };
}

// ── API: obtener precios cacheados ─────────────────────
app.get('/api/prices', (req, res) => {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(raw);
    const ageMs = Date.now() - new Date(cache.lastUpdated).getTime();
    const ageHours = Math.round(ageMs / 3600000);
    cache.isStale = ageHours > 48;
    cache.ageHours = ageHours;
    res.json({ success: true, data: cache });
  } catch (e) {
    if (e.code === 'ENOENT') {
      return res.json({ success: false, message: 'Sin caché. Ejecuta el primer scraping.' });
    }
    res.status(500).json({ success: false, message: 'Error leyendo caché: ' + e.message });
  }
});

// ── API: configuración de tiendas y productos ─────────
app.get('/api/config', (req, res) => res.json(readConfig()));
app.post('/api/config', requireAuth, (req, res) => {
  const body = req.body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: 'Body debe ser un objeto JSON' });
  }
  const validated = {
    enabledStores: Array.isArray(body.enabledStores) ? body.enabledStores.filter(s => typeof s === 'string') : null,
    enabledProducts: Array.isArray(body.enabledProducts) ? body.enabledProducts.filter(p => typeof p === 'string') : null,
  };
  const json = JSON.stringify(validated, null, 2);
  if (json.length > 50000) {
    return res.status(400).json({ success: false, message: 'Config demasiado grande' });
  }
  fs.writeFileSync(CONFIG_FILE, json);
  res.json({ success: true });
});

// ── API: catálogo de productos ─────────────────────────
app.get('/api/products', (req, res) => {
  const { PRODUCTS } = require('./scrapers');
  res.json({ success: true, data: PRODUCTS });
});

// ── API: estado del scraping ───────────────────────────
app.get('/api/status', (req, res) => {
  res.json(scrapeStatus);
});

// ── API: lanzar scraping manual ────────────────────────
app.post('/api/scrape', requireAuth, rateLimit(3), async (req, res) => {
  if (scrapeStatus.running) {
    return res.json({ success: false, message: 'Ya hay un scraping en progreso.' });
  }
  // Aceptar filtros opcionales en el body (sin modificar config.json)
  const filters = req.body || {};
  res.json({ success: true, message: 'Scraping iniciado en segundo plano.' });
  runScrape(null, filters.enabledStores || null, filters.enabledProducts || null);
});

// ── API: forzar actualización de una tienda específica ─
app.post('/api/scrape/store/:storeId', requireAuth, rateLimit(3), async (req, res) => {
  if (scrapeStatus.running) {
    return res.json({ success: false, message: 'Ya hay un scraping en progreso.' });
  }
  res.json({ success: true, message: `Scraping de ${req.params.storeId} iniciado.` });
  runScrape(req.params.storeId);
});

// ── FUNCIÓN PRINCIPAL ──────────────────────────────────
async function runScrape(onlyStore = null, filterStores = null, filterProducts = null) {
  const { scrapeAll } = require('./scrapers');
  const cfg = readConfig();
  // Filtros del request tienen prioridad sobre config.json
  const effectiveStores = filterStores || cfg.enabledStores;
  const effectiveProducts = filterProducts || cfg.enabledProducts;

  scrapeStatus = {
    running: true,
    progress: 0,
    currentStore: '',
    currentProduct: '',
    startTime: new Date().toISOString(),
    lastRun: new Date().toISOString(),
    lastRunDuration: null,
    error: null,
    stats: { found: 0, notFound: 0, errors: 0 },
  };

  const startMs = Date.now();
  log.info(`Iniciando scraping${onlyStore ? ` de ${onlyStore}` : ' completo'}...`);

  try {
    const prices = await scrapeAll({
      onlyStore,
      enabledStores: effectiveStores,
      enabledProducts: effectiveProducts,
      onProgress: (progress, store, product) => {
        scrapeStatus.progress = progress;
        scrapeStatus.currentStore = store;
        scrapeStatus.currentProduct = product;
      },
      onResult: (found) => {
        if (found) scrapeStatus.stats.found++;
        else scrapeStatus.stats.notFound++;
      },
      onError: () => {
        scrapeStatus.stats.errors++;
      },
    });

    // Guardar caché (merge con caché existente si es parcial)
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    let finalPrices = prices;
    if (onlyStore) {
      try {
        const existing = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        finalPrices = mergeStorePrices(existing.prices || {}, prices, onlyStore);
      } catch {
        // Sin caché existente o corrupto — usar solo los precios nuevos
      }
    }

    const duration = Math.round((Date.now() - startMs) / 1000);

    // Calcular timestamps por tienda
    const storeTimestamps = {};
    const now = new Date().toISOString();
    for (const stores of Object.values(finalPrices)) {
      for (const storeId of Object.keys(stores)) {
        storeTimestamps[storeId] = now;
      }
    }

    const cacheData = {
      lastUpdated: now,
      duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
      stats: scrapeStatus.stats,
      storeTimestamps,
      prices: finalPrices,
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    scrapeStatus.lastRunDuration = cacheData.duration;

    // Guardar snapshot de historial (1 por día)
    try {
      if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
      const dateStr = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(path.join(HISTORY_DIR, `prices_${dateStr}.json`), JSON.stringify(cacheData));
      // Limpiar archivos > 30 días
      const histFiles = fs.readdirSync(HISTORY_DIR).filter(f => f.startsWith('prices_')).sort();
      for (const old of histFiles.slice(0, -30)) {
        fs.unlinkSync(path.join(HISTORY_DIR, old));
      }
    } catch (e) {
      log.warn('Error guardando historial:', e.message);
    }

    log.info(`Scraping completado en ${cacheData.duration}. Encontrados: ${scrapeStatus.stats.found}, No encontrados: ${scrapeStatus.stats.notFound}, Errores: ${scrapeStatus.stats.errors}`);

  } catch (err) {
    scrapeStatus.error = err.message;
    log.error('Error en scraping:', err.message);
  } finally {
    scrapeStatus.running = false;
    scrapeStatus.progress = 100;
  }
}

function mergeStorePrices(existing, newPrices, storeId) {
  const merged = { ...existing };
  for (const productId of Object.keys(newPrices)) {
    if (!merged[productId]) merged[productId] = {};
    if (newPrices[productId][storeId]) {
      merged[productId][storeId] = newPrices[productId][storeId];
    }
  }
  return merged;
}

// ── API: log de scraping (historial de ejecuciones) ───
app.get('/api/scrape-log', (req, res) => {
  try {
    if (!fs.existsSync(HISTORY_DIR)) return res.json({ success: true, data: [] });
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.startsWith('prices_') && f.endsWith('.json'))
      .sort()
      .reverse();

    const logs = [];
    for (const file of files.slice(0, 30)) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf8'));
        const date = file.replace('prices_', '').replace('.json', '');
        const productIds = Object.keys(raw.prices || {});
        const storeSet = new Set();
        let totalEntries = 0, withImage = 0;
        const storeCounts = {};
        for (const stores of Object.values(raw.prices || {})) {
          for (const [sid, info] of Object.entries(stores)) {
            storeSet.add(sid);
            totalEntries++;
            if (info?.image) withImage++;
            storeCounts[sid] = (storeCounts[sid] || 0) + 1;
          }
        }
        const found = raw.stats?.found || totalEntries;
        const notFound = raw.stats?.notFound || 0;
        const total = found + notFound;
        logs.push({
          date,
          lastUpdated: raw.lastUpdated,
          duration: raw.duration,
          stats: raw.stats || {},
          products: productIds.length,
          storeEntries: totalEntries,
          stores: [...storeSet],
          storeCounts,
          withImage,
          successRate: total > 0 ? Math.round((found / total) * 100) : 0,
        });
      } catch {}
    }
    res.json({ success: true, data: logs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── API: reporte de salud del scraper ─────────────────
app.get('/api/report', (req, res) => {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(raw);
    const prices = cache.prices || {};
    const storeTimestamps = cache.storeTimestamps || {};
    const { PRODUCTS } = require('./scrapers');

    // Productos que realmente se intentaron scrapear (los que están en el cache)
    const scrapedProductIds = Object.keys(prices);
    const scrapedCount = scrapedProductIds.length;
    const totalCatalog = PRODUCTS.length;

    // Calcular stats por tienda
    const storeStats = {};
    for (const [productId, stores] of Object.entries(prices)) {
      for (const [storeId, info] of Object.entries(stores)) {
        if (!storeStats[storeId]) storeStats[storeId] = { found: 0, withImage: 0, prices: [], products: [] };
        storeStats[storeId].found++;
        storeStats[storeId].products.push(productId);
        if (info?.image) storeStats[storeId].withImage++;
        if (info?.unitPrice) storeStats[storeId].prices.push(info.unitPrice);
        else if (info?.price) storeStats[storeId].prices.push(info.price);
      }
    }

    const globalFound = cache.stats?.found || 0;
    const globalNotFound = cache.stats?.notFound || 0;
    const globalTotal = globalFound + globalNotFound;
    // Número de tiendas usadas
    const storeCount = Object.keys(storeStats).length;

    const report = Object.entries(storeStats).map(([storeId, stats]) => {
      // Éxito = encontrados / productos intentados (no catálogo completo)
      const attempted = scrapedCount;
      const minPrice = stats.prices.length ? Math.min(...stats.prices) : 0;
      const maxPrice = stats.prices.length ? Math.max(...stats.prices) : 0;
      return {
        store: storeId,
        found: stats.found,
        attempted,
        totalCatalog,
        successRate: Math.round((stats.found / Math.max(attempted, 1)) * 100),
        withImage: stats.withImage,
        imageRate: Math.round((stats.withImage / Math.max(stats.found, 1)) * 100),
        avgPrice: stats.prices.length ? Math.round(stats.prices.reduce((a, b) => a + b) / stats.prices.length) : 0,
        minPrice,
        maxPrice,
        lastUpdated: storeTimestamps[storeId] || null,
      };
    }).sort((a, b) => b.successRate - a.successRate);

    res.json({
      success: true,
      data: {
        lastScrape: cache.lastUpdated,
        duration: cache.duration,
        globalStats: cache.stats,
        scrapedProducts: scrapedCount,
        totalCatalog,
        globalSuccessRate: globalTotal > 0 ? Math.round((globalFound / globalTotal) * 100) : 0,
        stores: report,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── API: historial de precios ─────────────────────────
app.get('/api/history/:productId', (req, res) => {
  try {
    if (!fs.existsSync(HISTORY_DIR)) return res.json({ success: true, data: [] });
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.startsWith('prices_') && f.endsWith('.json'))
      .sort();
    const history = [];
    for (const file of files.slice(-30)) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf8'));
        const date = file.replace('prices_', '').replace('.json', '');
        const productPrices = raw.prices?.[req.params.productId];
        if (productPrices) {
          const storePrices = {};
          for (const [storeId, info] of Object.entries(productPrices)) {
            storePrices[storeId] = info?.price || info;
          }
          history.push({ date, prices: storePrices });
        }
      } catch {}
    }
    res.json({ success: true, data: history });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── CRON: scraping diario a las 6:00 AM (completo) ────
cron.schedule(defaults.CRON_SCHEDULE, () => {
  log.info('Ejecutando scraping diario programado...');
  runScrape();
}, { timezone: defaults.CRON_TIMEZONE });

// ── CRON: refresh vespertino 6:00 PM (solo tiendas API: rápidas y confiables) ──
cron.schedule('0 18 * * *', async () => {
  const apiStores = ['unimarc', 'descorcha', 'operals', 'tost'];
  log.info('Refresh vespertino: actualizando tiendas API...');
  for (const store of apiStores) {
    if (!scrapeStatus.running) {
      await runScrape(store);
    }
  }
}, { timezone: defaults.CRON_TIMEZONE });

// ── Capturar errores no controlados para que el proceso no muera silenciosamente ──
process.on('uncaughtException', (err) => {
  log.error('Error inesperado:', err.message);
});
process.on('unhandledRejection', (reason) => {
  log.error('Promesa rechazada sin manejar:', reason?.message || reason);
});

// ── INICIO ────────────────────────────────────────────
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🍻  Copetón                           ║');
  console.log(`║   → http://localhost:${PORT}             ║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Scraping automático: diario 06:00 AM  ║');
  console.log('║  Para scraping manual: POST /api/scrape║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // Si no hay caché, ejecutar scraping inicial en 5 segundos
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(raw);
    const updated = new Date(cache.lastUpdated);
    console.log(`📦 Caché existente: actualizado el ${updated.toLocaleString('es-CL')}`);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('⚠️  Sin caché detectado. Ejecutando scraping inicial en 5 segundos...');
    } else {
      console.warn('⚠️  Caché corrupto, se ejecutará scraping inicial:', e.message);
    }
    console.log('   (También puedes hacer clic en "Actualizar precios" en el navegador)');
    setTimeout(runScrape, 5000);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌ ERROR: El puerto ${PORT} ya está en uso.`);
    console.error(`     Ya hay un servidor Copetón corriendo.`);
    console.error(`     Cierra esa ventana primero, luego vuelve a abrir start.bat.`);
    console.error(`     O simplemente abre: http://localhost:${PORT}\n`);
  } else {
    console.error(`\n  ❌ ERROR al iniciar el servidor: ${err.message}\n`);
  }
  process.exit(1);
});
