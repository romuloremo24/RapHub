"""RadarAuto – FastAPI backend."""
from __future__ import annotations
import hashlib, json, logging, os, statistics
from pathlib import Path
from typing import List, Optional
from cachetools import TTLCache

from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

FRONTEND_DIR = Path(__file__).parent.parent

from scrapers.base import SearchFilters
from scrapers.manager import search_sources, search_sources_stream, SOURCE_INFO
from database import init_db, get_db, User, SavedSearch, Alert
from auth import hash_password, verify_password, create_token, get_current_user_id
from scheduler import start_scheduler
from history_db import init_history_db, get_price_history, get_market_stats, get_history_listings, get_scrape_log, get_best_deals

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_history_db()
    start_scheduler()
    yield

app = FastAPI(
    title="RadarAuto API",
    description="Agrega resultados de autos desde múltiples portales chilenos.",
    version="2.0.0",
    lifespan=lifespan,
)

_ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000",
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Cache de búsquedas: TTL 5 minutos, máximo 200 entradas distintas
_search_cache: TTLCache = TTLCache(maxsize=200, ttl=300)



# ── Pydantic schemas ────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email: str
    nombre: str
    apellido: str
    password: str

class LoginIn(BaseModel):
    email: str
    password: str

class SavedSearchIn(BaseModel):
    name: str
    params: dict        # {brand, model, year_from, ..., sources: [...]}

class AlertIn(BaseModel):
    name: str
    params: dict        # same as SavedSearchIn


# ── Auth routes ─────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
async def register(body: RegisterIn, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres")
    if not body.nombre.strip() or not body.apellido.strip():
        raise HTTPException(400, "Nombre y apellido son obligatorios")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(400, "El email ya está registrado")
    user = User(
        email=body.email.lower(),
        nombre=body.nombre.strip(),
        apellido=body.apellido.strip(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id, user.email), "email": user.email, "nombre": user.nombre, "apellido": user.apellido}


@app.post("/api/auth/login")
async def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email o contraseña incorrectos")
    return {"token": create_token(user.id, user.email), "email": user.email}


@app.get("/api/auth/me")
async def me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return {"id": user.id, "email": user.email, "nombre": user.nombre, "apellido": user.apellido}


class UpdateProfileIn(BaseModel):
    nombre: str
    apellido: str

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

@app.put("/api/auth/me")
async def update_profile(body: UpdateProfileIn, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not body.nombre.strip() or not body.apellido.strip():
        raise HTTPException(400, "Nombre y apellido son obligatorios")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.nombre = body.nombre.strip()
    user.apellido = body.apellido.strip()
    db.commit()
    return {"id": user.id, "email": user.email, "nombre": user.nombre, "apellido": user.apellido}

@app.put("/api/auth/password")
async def change_password(body: ChangePasswordIn, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Contraseña actual incorrecta")
    if len(body.new_password) < 6:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 6 caracteres")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


# ── Saved searches ──────────────────────────────────────────────────────────

@app.get("/api/saved-searches")
async def list_saved_searches(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rows = db.query(SavedSearch).filter(SavedSearch.user_id == user_id).order_by(SavedSearch.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "params": json.loads(r.params), "created_at": r.created_at} for r in rows]


@app.post("/api/saved-searches")
async def create_saved_search(
    body: SavedSearchIn,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = SavedSearch(user_id=user_id, name=body.name, params=json.dumps(body.params))
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name, "params": json.loads(row.params)}


@app.delete("/api/saved-searches/{search_id}")
async def delete_saved_search(
    search_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = db.query(SavedSearch).filter(SavedSearch.id == search_id, SavedSearch.user_id == user_id).first()
    if not row:
        raise HTTPException(404, "Búsqueda no encontrada")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ── Alerts ──────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
async def list_alerts(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rows = db.query(Alert).filter(Alert.user_id == user_id).order_by(Alert.created_at.desc()).all()
    return [
        {
            "id": r.id, "name": r.name, "params": json.loads(r.params),
            "active": r.active, "last_run": r.last_run, "created_at": r.created_at,
        }
        for r in rows
    ]


@app.post("/api/alerts")
async def create_alert(
    body: AlertIn,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = Alert(user_id=user_id, name=body.name, params=json.dumps(body.params))
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "name": row.name, "active": row.active}


@app.patch("/api/alerts/{alert_id}")
async def toggle_alert(
    alert_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if not row:
        raise HTTPException(404, "Alerta no encontrada")
    row.active = not row.active
    db.commit()
    return {"id": row.id, "active": row.active}


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if not row:
        raise HTTPException(404, "Alerta no encontrada")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ── Search ──────────────────────────────────────────────────────────────────

@app.get("/api/search/stream")
async def search_stream(
    q:            Optional[str]   = Query(None),
    brand:        Optional[str]   = Query(None),
    model:        Optional[str]   = Query(None),
    condition:    Optional[str]   = Query(None),
    year_from:    Optional[int]   = Query(None, ge=1970, le=2030),
    year_to:      Optional[int]   = Query(None, ge=1970, le=2030),
    price_from:   Optional[float] = Query(None, ge=0),
    price_to:     Optional[float] = Query(None, ge=0),
    km_max:       Optional[int]   = Query(None, ge=0),
    fuel_type:    Optional[str]   = Query(None),
    transmission: Optional[str]   = Query(None),
    region:       Optional[str]   = Query(None),
    sources:      Optional[str]   = Query(None),
    limit:        int             = Query(48, ge=1, le=100),
    offset:       int             = Query(0,  ge=0),
):
    """SSE endpoint: streams scraping progress as each source finishes."""
    filters = SearchFilters(
        query=q, brand=brand, model=model, condition=condition,
        year_from=year_from, year_to=year_to,
        price_from=price_from, price_to=price_to,
        km_max=km_max, fuel_type=fuel_type,
        transmission=transmission, region=region,
        limit=limit, offset=offset,
    )
    source_list: Optional[List[str]] = None
    if sources:
        source_list = [s.strip() for s in sources.split(",") if s.strip()]

    async def event_generator():
        try:
            async for event_type, data in search_sources_stream(filters, source_list):
                payload = json.dumps({"event": event_type, **data}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
        except Exception as exc:
            logger.exception("Stream search failed")
            err = json.dumps({"event": "error", "message": str(exc)})
            yield f"data: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/sources")
async def get_sources():
    return {k: {"id": k, **v} for k, v in SOURCE_INFO.items()}


@app.get("/api/search")
async def search(
    q:            Optional[str]   = Query(None),
    brand:        Optional[str]   = Query(None),
    model:        Optional[str]   = Query(None),
    condition:    Optional[str]   = Query(None),
    year_from:    Optional[int]   = Query(None, ge=1970, le=2030),
    year_to:      Optional[int]   = Query(None, ge=1970, le=2030),
    price_from:   Optional[float] = Query(None, ge=0),
    price_to:     Optional[float] = Query(None, ge=0),
    km_max:       Optional[int]   = Query(None, ge=0),
    fuel_type:    Optional[str]   = Query(None),
    transmission: Optional[str]   = Query(None),
    region:       Optional[str]   = Query(None),
    sources:      Optional[str]   = Query(None),
    limit:        int             = Query(48, ge=1, le=100),
    offset:       int             = Query(0,  ge=0),
):
    filters = SearchFilters(
        query=q, brand=brand, model=model, condition=condition,
        year_from=year_from, year_to=year_to,
        price_from=price_from, price_to=price_to,
        km_max=km_max, fuel_type=fuel_type,
        transmission=transmission, region=region,
        limit=limit, offset=offset,
    )
    source_list: Optional[List[str]] = None
    if sources:
        source_list = [s.strip() for s in sources.split(",") if s.strip()]

    # Cache key based on all search parameters
    cache_key = hashlib.md5(
        json.dumps({
            "q": q, "brand": brand, "model": model, "condition": condition,
            "year_from": year_from, "year_to": year_to,
            "price_from": price_from, "price_to": price_to,
            "km_max": km_max, "fuel_type": fuel_type,
            "transmission": transmission, "region": region,
            "sources": sorted(source_list or []),
        }, sort_keys=True).encode()
    ).hexdigest()

    if cache_key in _search_cache:
        logger.info("Search cache hit: %s", cache_key[:8])
        return _search_cache[cache_key]

    try:
        result = await search_sources(filters, source_list)
        _search_cache[cache_key] = result
        return result
    except Exception as exc:
        logger.exception("Search failed")
        return JSONResponse(status_code=500, content={"error": str(exc), "results": [], "total": 0})


# ── Facebook login ───────────────────────────────────────────────────────────

FB_COOKIES_FILE = Path(__file__).parent / "facebook_cookies.json"

@app.get("/api/facebook/status")
async def facebook_status():
    if not FB_COOKIES_FILE.exists() or FB_COOKIES_FILE.stat().st_size < 10:
        return {"logged_in": False}
    try:
        cookies = json.loads(FB_COOKIES_FILE.read_text(encoding="utf-8"))
        logged_in = any(c["name"] == "c_user" for c in cookies)
    except Exception:
        logged_in = False
    return {"logged_in": logged_in}

@app.post("/api/facebook/login")
async def facebook_login():
    """Abre un browser visible para login manual de Facebook, guarda las cookies."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise HTTPException(500, "playwright no instalado")

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=False,
                args=["--no-sandbox", "--start-maximized"],
            )
            ctx = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="es-CL",
                viewport={"width": 1280, "height": 900},
            )
            page = await ctx.new_page()
            await page.goto("https://www.facebook.com/login", timeout=15000)

            # Wait up to 3 minutes for c_user cookie (definitive login indicator)
            logged_in = False
            for _ in range(180):
                await page.wait_for_timeout(1000)
                cookies_now = await ctx.cookies("https://www.facebook.com")
                cookie_names = {c["name"] for c in cookies_now}
                if "c_user" in cookie_names and "xs" in cookie_names:
                    logged_in = True
                    # Extra wait so Facebook finishes setting all session cookies
                    await page.wait_for_timeout(2000)
                    break

            cookies = await ctx.cookies()
            await browser.close()

        if not cookies or not any(c["name"] == "c_user" for c in cookies):
            raise HTTPException(400, "Login no completado. Asegúrate de iniciar sesión completamente.")

        FB_COOKIES_FILE.write_text(
            json.dumps(cookies, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info("Facebook cookies saved (%d cookies)", len(cookies))
        return {"ok": True, "cookies": len(cookies)}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Facebook login failed")
        raise HTTPException(500, f"Error durante el login: {exc}")

@app.post("/api/facebook/logout")
async def facebook_logout():
    if FB_COOKIES_FILE.exists():
        FB_COOKIES_FILE.unlink()
    return {"ok": True}


# ── Price history & market stats ────────────────────────────────────────────

@app.get("/api/price-history")
async def price_history(
    brand:     str            = Query(...),
    model:     str            = Query(...),
    year_from: Optional[int]  = Query(None),
    year_to:   Optional[int]  = Query(None),
):
    """Daily aggregated prices for a brand+model over time."""
    data = get_price_history(brand, model, year_from, year_to)
    return {"brand": brand, "model": model, "data": data}


@app.get("/api/history-listings")
async def history_listings_endpoint(
    brand:     str           = Query(...),
    model:     str           = Query(None),
    year_from: Optional[int] = Query(None),
    year_to:   Optional[int] = Query(None),
    km_max:    Optional[int] = Query(None),
):
    """Individual snapshots for scatter-plot analysis (latest price per listing)."""
    data = get_history_listings(brand, model or "", year_from, year_to, km_max)
    return {"brand": brand, "model": model, "count": len(data), "listings": data}


@app.get("/api/market-stats")
async def market_stats(
    brand:  str           = Query(...),
    model:  str           = Query(...),
    year:   Optional[int] = Query(None),
    km_max: Optional[int] = Query(None),
):
    """Current market stats (median, avg, percentiles) from last 30 days of scraped data."""
    stats = get_market_stats(brand, model, year, km_max)
    return {"brand": brand, "model": model, "stats": stats}


@app.get("/api/best-deals")
async def best_deals_endpoint(
    brand:     Optional[str] = Query(None),
    model:     Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to:   Optional[int] = Query(None),
    km_max:    Optional[int] = Query(None),
    days:      int           = Query(60, ge=1, le=365),
    limit:     int           = Query(20, ge=1, le=50),
):
    """Return listings priced significantly below their year-adjusted median (best deals)."""
    deals = get_best_deals(brand, model, year_from, year_to, km_max, days, limit)
    return {"count": len(deals), "deals": deals}


@app.post("/api/admin/scrape-now")
async def scrape_now():
    """Manually trigger the full daily scrape (runs in background)."""
    import asyncio
    from daily_job import run_full_scrape
    asyncio.create_task(run_full_scrape())
    return {"ok": True, "message": "Daily scrape started in background"}


@app.get("/api/admin/scrape-log")
async def scrape_log_endpoint(days: int = Query(14, ge=1, le=90)):
    """Return recent scrape log entries."""
    return {"log": get_scrape_log(days)}


# ── Static / health ─────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "RadarAuto API"}


@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/radarauto.png", include_in_schema=False)
async def serve_logo():
    return FileResponse(FRONTEND_DIR / "radarauto.png", media_type="image/png")
