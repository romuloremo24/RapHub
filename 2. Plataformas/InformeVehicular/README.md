# InformeVehicular — Informe completo de un auto por patente

## Que hace

Dashboard web que, dado el numero de patente de un auto chileno, consulta multiples fuentes publicas en paralelo y muestra un informe consolidado: si tiene encargo de robo, si tiene deuda de TAG, si esta al dia con la revision tecnica, y otros datos relevantes.

## Flujo paso a paso

1. El usuario ingresa una patente en el formulario (ej: `JCDS27`)
2. El backend lanza todos los scrapers en paralelo con `asyncio.gather` (timeout de 60s cada uno)
3. Cada scraper navega con Playwright headless o hace requests a su fuente correspondiente
4. Los resultados llegan a medida que se completan y el frontend muestra los badges de estado
5. Cada item muestra: **OK** (verde), **NO CUMPLE** (rojo), **No disponible** (gris) o **Verificar** (requiere accion manual)

## Como ejecutar

```bash
# Doble clic en start.bat (mata procesos previos en 8001 y abre el navegador)
4. Plataformas/InformeVehicular/start.bat

# O manualmente:
cd "4. Plataformas/InformeVehicular/backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --no-access-log
# Abre http://localhost:8001
```

**Importante:** no usar `--reload`. El file watcher de uvicorn falla en rutas OneDrive.

## Estado de cada fuente

| Fuente | Que verifica | Estado |
|--------|-------------|--------|
| autoseguro.gob.cl (PDI) | Encargo de robo | Funcionando |
| pasastesintag.cl | Deuda de autopistas TAG | Funcionando |
| prt.cl | Revision tecnica | Requiere creditos en CapSolver (reCAPTCHA) |
| TGR | Permiso de circulacion | No automatizable — requiere Clave Unica del propietario |
| Registro Civil (RNVR) | Datos tecnicos del vehiculo | No automatizable — solo el propietario puede consultarlo |
| SOAP | Seguro obligatorio | No existe consulta publica |
| JPL | Multas | Portal frecuentemente caido |
| CASER | Remates | Base de datos privada (contrato comercial) |

## API

```
GET /api/report/{patente}
```

Retorna un JSON con los resultados de todas las fuentes. Ejemplo: `/api/report/JCDS27`

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `index.html` | SPA frontend — formulario y visualizacion de resultados |
| `backend/main.py` | FastAPI — endpoint `/api/report/{patente}` |
| `backend/scrapers/autoseguro.py` | Scraper PDI (encargo robo) |
| `backend/scrapers/pasastesintag.py` | Scraper TAG (deuda autopistas) |
| `backend/scrapers/prt.py` | Scraper revision tecnica (requiere CapSolver) |
| `backend/scrapers/captcha_solver.py` | Wrapper para CapSolver API |
| `start.bat` | Launcher: mata puerto 8001 y abre el navegador |
| `CONTEXT.md` | Documentacion tecnica detallada del proyecto |

## Credenciales requeridas (en `1. Config/.env`)

| Variable | Descripcion | Estado |
|----------|-------------|--------|
| `CAPSOLVER_API_KEY` | Para resolver reCAPTCHA de prt.cl | Configurada, sin creditos |
| `CLAVE_UNICA_RUT` | RUT para login Clave Unica | Configurada |
| `CLAVE_UNICA_PASS` | Password Clave Unica | Configurada |
