# RadarAuto — Comparador de autos usados en Chile

## Que hace

Aplicacion web que busca el mismo auto en multiples portales chilenos al mismo tiempo y muestra los resultados comparados, indicando si cada precio es bajo, justo o alto respecto al mercado. Incluye historial de precios, alertas por email y exportacion a Excel.

## Flujo paso a paso

1. El usuario ingresa marca, modelo y anio en el buscador
2. El backend lanza los scrapers de forma paralela contra todos los portales configurados
3. Cada scraper retorna los avisos encontrados (titulo, precio, ano, enlace, imagen)
4. El sistema deduplica resultados identicos que aparecen en varios portales
5. Calcula el promedio y mediana del mercado para esa busqueda
6. Anota cada aviso con un `price_score`: **bajo** (verde), **justo** (amarillo) o **alto** (rojo)
7. Los resultados llegan al frontend via streaming (aparecen a medida que se van obteniendo)
8. El frontend muestra skeleton loaders mientras carga y luego los cards con badges de precio
9. En segundo plano, el scheduler guarda los precios en el historial para graficar tendencias

### Scrapers incluidos (12 fuentes)

MercadoLibre, ChileAutos, Kavak, Yapo, AutoCosmos, AutosUsados, Auto.cl, Clicar, Gildemeister, AutoJusto, Economicos, Facebook Marketplace

## Como ejecutar

```bash
cd "4. Plataformas/Comparacion_Autos/backend"
.venv/Scripts/activate
uvicorn main:app --reload
# Abre http://localhost:8000
```

## Funcionalidades adicionales

| Funcion | Descripcion |
|---------|-------------|
| Alertas de precio | El usuario guarda una busqueda con precio maximo; si aparece un aviso por debajo se envia email |
| Historial de precios | Grafico de como evoluciono el precio de un modelo en el tiempo |
| Exportar Excel | Descarga los resultados de una busqueda en formato .xlsx |
| Autenticacion | Registro/login de usuarios para guardar busquedas y alertas |
| Cache | Las busquedas repetidas en 5 minutos usan cache para no re-scrapear |

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `backend/main.py` | API FastAPI — endpoints de busqueda, usuarios, alertas |
| `backend/scrapers/manager.py` | Orquesta los scrapers, deduplica y calcula price_score |
| `backend/scrapers/` | Un archivo por portal (base.py define la interfaz comun) |
| `backend/scheduler.py` | APScheduler — ejecuta las alertas y guarda historial periodicamente |
| `backend/database.py` | Modelos SQLAlchemy para usuarios, busquedas y alertas |
| `backend/history_db.py` | Base de datos de historial de precios |
| `index.html` | SPA frontend servida por FastAPI |
| `radarauto.db` | Base de datos SQLite principal |
| `price_history.db` | Base de datos SQLite de historial |

## Credenciales requeridas (en `1. Config/.env`)

| Variable | Descripcion |
|----------|-------------|
| `SECRET_KEY` | Clave JWT para autenticacion (obligatoria) |
| `ALLOWED_ORIGINS` | CORS origins permitidos (por defecto: localhost) |
| Variables SMTP | Para envio de alertas por email |
