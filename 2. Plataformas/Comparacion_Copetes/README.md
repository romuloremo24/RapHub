# Comparacion Copetes — Comparador de precios de bebestibles

## Que hace

Aplicacion web que compara precios de tragos, cervezas, vinos y otros bebestibles entre distintas tiendas y supermercados chilenos. Hace scraping automatico a intervalos regulares y guarda los precios en cache para mostrarlos al instante.

## Flujo paso a paso

1. El servidor Express arranca en el puerto 3000 y sirve el frontend
2. Al iniciar (y cada vez que se dispara el cron) se ejecuta el scraping de todas las tiendas habilitadas
3. Cada tienda tiene su scraper en `scrapers.js` que usa Puppeteer para navegar y extraer precios
4. Los resultados se guardan en `cache/prices.json`
5. El usuario abre el navegador, ve la tabla de precios y puede filtrar por producto o tienda
6. Desde el panel se puede lanzar un scraping manual o actualizar una tienda especifica
7. El endpoint `/api/status` muestra el progreso en tiempo real (tienda actual, % completado)

## Como ejecutar

```bash
cd "4. Plataformas/Comparacion_Copetes"
node server.js
# Abre http://localhost:3000
```

Para instalar dependencias por primera vez:
```bash
npm install
```

## Configuracion

El archivo `config.json` controla que tiendas y productos se scrapean:

```json
{
  "enabledStores": ["jumbo", "lider", "unimarc"],
  "enabledProducts": ["cerveza", "pisco", "vino"]
}
```

Se puede editar directamente o desde el panel web via `POST /api/config`.

## API endpoints

| Endpoint | Descripcion |
|----------|-------------|
| `GET /api/prices` | Retorna el cache actual de precios |
| `GET /api/status` | Estado del scraping en curso (progreso, tienda actual) |
| `POST /api/scrape` | Lanza un scraping completo en segundo plano |
| `POST /api/scrape/store/:id` | Actualiza solo una tienda especifica |
| `GET /api/config` | Lee la configuracion activa |
| `POST /api/config` | Guarda nueva configuracion |

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `server.js` | Servidor Express + cron + API endpoints |
| `scrapers.js` | Logica de scraping por tienda (Puppeteer) |
| `index.html` | Frontend — tabla de precios y panel de control |
| `config.json` | Tiendas y productos habilitados |
| `cache/prices.json` | Ultimo resultado guardado del scraping |
| `package.json` | Dependencias: express, puppeteer, node-cron |
