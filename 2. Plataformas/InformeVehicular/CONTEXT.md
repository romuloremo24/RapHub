# InformeVehicular — Contexto del Proyecto

## Qué es
Dashboard web para generar un informe vehicular completo de un auto chileno a partir de su patente. Consulta múltiples fuentes públicas en paralelo y muestra resultados consolidados en una SPA.

## Stack
- **Backend**: FastAPI + uvicorn (Python 3.13), Playwright async (Chromium headless), BeautifulSoup
- **Frontend**: SPA HTML/JS puro en `index.html` (sin framework)
- **Puerto**: 8001 (localhost)
- **Config**: `.env` cargado desde `1. Config/.env` (global del workspace)

## Cómo iniciar
```bat
# Doble clic en start.bat (mata procesos previos en 8001 y abre el navegador)
InformeVehicular\start.bat

# O manualmente desde backend/:
cd InformeVehicular\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --no-access-log
```

**IMPORTANTE — uvicorn `--reload` no funciona** en rutas OneDrive (el file watcher falla). Usar sin `--reload` y reiniciar manualmente al cambiar archivos.

## Para reiniciar el servidor (Windows)
```bash
# Encontrar PID en puerto 8001
netstat -aon | grep ":8001 "
# Matar con PowerShell (más confiable que taskkill para procesos zombie)
powershell -Command "Get-Process -Id <PID> | ForEach-Object { $_.Kill() }"
# Puede haber un hijo (multiprocessing.spawn) — buscar con:
powershell -Command "Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq <PID> } | Select-Object ProcessId,Name"
```

## Estructura de archivos
```
InformeVehicular/
├── index.html                    # SPA frontend
├── start.bat                     # Launcher (mata puerto 8001 + abre browser)
├── CONTEXT.md                    # Este archivo
└── backend/
    ├── main.py                   # FastAPI app, carga .env desde 1. Config/.env
    ├── diagnose.py               # Script diagnóstico standalone
    └── scrapers/
        ├── autoseguro.py         # PDI — Encargo de robo (autoseguro.gob.cl)
        ├── prt.py                # Revisión técnica (prt.cl) — requiere CapSolver
        ├── pasastesintag.py      # TAG — Deuda autopistas (pasastesintag.cl)
        ├── permiso.py            # Permiso de circulación TGR — requiere Clave Única
        ├── rnvr.py               # Datos técnicos RNVR — NO automatizable públicamente
        ├── soap.py               # SOAP — no automatizable
        ├── multas.py             # Multas JPL — portal frecuentemente caído
        ├── remates.py            # Remates CASER — BD privada
        ├── kilometraje.py        # Kilometraje — no hay BD pública en Chile
        ├── clave_unica.py        # Helper OAuth Clave Única
        └── captcha_solver.py     # CapSolver API wrapper (ReCaptchaV2TaskProxyless)
```

## Variables de entorno requeridas (en `1. Config/.env`)
| Variable | Usado por | Estado |
|----------|-----------|--------|
| `CAPSOLVER_API_KEY` | prt.py (reCAPTCHA) | Configurado pero SIN CRÉDITOS — clave `CAP-C150...` expirada |
| `CLAVE_UNICA_RUT` | rnvr.py, permiso.py | Configurado |
| `CLAVE_UNICA_PASS` | rnvr.py, permiso.py | Configurado |

## Estado actual de cada scraper

### ✅ Funcionando
| Scraper | Fuente | Estado devuelto | Notas |
|---------|--------|-----------------|-------|
| autoseguro.py | autoseguro.gob.cl (PDI) | `alert` / `ok` | Playwright, sin CAPTCHA |
| pasastesintag.py | pasastesintag.cl (TAG) | `ok` / `alert` | Playwright, sin CAPTCHA |

### ⚠️ Requiere configuración
| Scraper | Problema | Solución |
|---------|----------|----------|
| prt.py | reCAPTCHA v2 — CapSolver key sin créditos | Recargar/crear cuenta en capsolver.com y actualizar `CAPSOLVER_API_KEY` |

### ℹ️ No automatizable (por diseño)
| Scraper | Razón | Lo que hace |
|---------|-------|-------------|
| rnvr.py | Registro Civil solo muestra datos del propietario registrado. Portal usa iframes + auth propia, no OAuth estándar | Devuelve `unavailable` con link directo + sugerencia Autofact/Checkcar |
| permiso.py | TGR requiere Clave Única del propietario | Devuelve `unavailable` con link directo |
| soap.py | No existe consulta pública de SOAP | Devuelve `unavailable` con lista de aseguradoras |
| multas.py | Portal JPL frecuentemente caído | Devuelve `unavailable` |
| remates.py | BD CASER es privada (contrato comercial) | Devuelve `unavailable` con link a Autofact |
| kilometraje.py | No existe BD pública de kilometraje en Chile | Devuelve `unavailable` |

## Bug raíz resuelto en esta sesión
`asyncio.TimeoutError` en Python 3.13 tiene `str() == ""` — cuando `page.wait_for_load_state("networkidle")` hacía timeout, el `except Exception as e` capturaba un error con mensaje vacío → `message: ""` → badge "Error" con texto vacío en el frontend.

**Fix aplicado en todos los scrapers**: envolver todas las llamadas `wait_for_load_state("networkidle")` en try/except que hace fallback a `wait_for_timeout`.

## Detalles técnicos de prt.cl
- **Formulario ASP.NET WebForms** con `__VIEWSTATE`, `__EVENTVALIDATION`
- **reCAPTCHA v2** con site key `6LctMP8SAAAAANBvpGMjkMm5bBJ7TY-7X9UuGAaq`
- La site key NO está en `data-sitekey` del DOM — está en el HTML source como `k=...` en la URL del iframe de reCAPTCHA
- El campo de patente es `#ContentPlaceHolder1_patenteInput`
- El botón submit es `#ContentPlaceHolder1_buscar` (tipo `image`, no `submit`)
- El CAPTCHA SÍ se valida server-side — sin token válido, no retorna datos
- La inyección del token usa `document.querySelectorAll('[name="g-recaptcha-response"]')`

## Detalles técnicos de RNVR / Registro Civil
- El portal usa **iframes internos**: `OficinaInternet/web/carro.srcei`, `loader.srcei`
- Los certificados vehiculares (Inscripción/Padrón) cuestan $1.430 CLP
- El flujo de auth NO es OAuth estándar — no redirige a `accounts.claveunica.gob.cl`
- `do_login()` en `clave_unica.py` fue actualizado: la validación de éxito ahora usa `wait_for_url` (URL fuera de claveunica) en vez de `networkidle`
- CONCLUSIÓN: RNVR no es viable para consultas de terceros de forma gratuita

## Frontend — funciones de renderizado relevantes
```javascript
badgeLabel(status)  // ok→"OK", alert→"NO CUMPLE", unavailable→"No disponible", captcha_required→"Verificar"
badgeClass(status)  // ok→verde, alert→rojo, warn→naranja, error→rosa, unavailable/unknown→gris
buildRnvr(d)        // muestra hint si d.hint existe
buildTheft(d)       // muestra manual-verify con link si d.direct_url
buildTag(d)         // muestra manual-verify o notice según status
```

## API endpoint
```
GET /api/report/{patente}
```
Responde con objeto JSON con claves: `patente`, `rnvr`, `theft_check`, `technical_inspection`, `tag_violations`, `permiso_circulacion`, `soap`, `multas`, `remates`, `kilometraje`

Todos los scrapers corren en paralelo con `asyncio.gather` y tienen timeout de 60s (`safe_scrape`).

## Próximos pasos sugeridos
1. **PRT**: recargar créditos en capsolver.com → actualizar `CAPSOLVER_API_KEY` → probar `/api/report/JCDS27`
2. **Multas JPL**: cuando el portal `consultas.jpl.gob.cl` vuelva a funcionar, el scraper debería retomar
3. **Permiso circulación**: evaluar si vale la pena mantener el Playwright login (solo sirve para el propietario)
4. **Datos técnicos**: evaluar alternativas para obtener marca/modelo/año desde la patente (ej. SII vehículos, MBI, datos.gob.cl)
