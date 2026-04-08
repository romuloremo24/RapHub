from dotenv import load_dotenv
from pathlib import Path

# Cargar .env central antes de importar scrapers
_env_path = Path(__file__).resolve().parent.parent.parent / "1. Config" / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from scrapers.autoseguro  import check_autoseguro
from scrapers.prt         import check_prt
from scrapers.pasastesintag import check_pasastesintag
from scrapers.permiso     import check_permiso
from scrapers.rnvr        import check_rnvr
from scrapers.soap        import check_soap
from scrapers.multas      import check_multas
from scrapers.remates     import check_remates
from scrapers.kilometraje import check_kilometraje

app = FastAPI(title="InformeAuto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).parent.parent


def normalize_patente(patente: str) -> str:
    return patente.upper().replace("-", "").replace(".", "").replace(" ", "")


async def safe_scrape(coro, timeout: int = 60):
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return {"status": "error", "message": "Tiempo de espera agotado"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/report/{patente}")
async def get_report(patente: str):
    p = normalize_patente(patente)

    (theft, tech, tag, permiso, rnvr, soap, multas, remates, km) = await asyncio.gather(
        safe_scrape(check_autoseguro(p)),
        safe_scrape(check_prt(p)),
        safe_scrape(check_pasastesintag(p)),
        safe_scrape(check_permiso(p)),
        safe_scrape(check_rnvr(p)),
        safe_scrape(check_soap(p)),
        safe_scrape(check_multas(p)),
        safe_scrape(check_remates(p)),
        safe_scrape(check_kilometraje(p)),
    )

    return {
        "patente":              p,
        "rnvr":                 rnvr,
        "theft_check":          theft,
        "technical_inspection": tech,
        "tag_violations":       tag,
        "permiso_circulacion":  permiso,
        "soap":                 soap,
        "multas":               multas,
        "remates":              remates,
        "kilometraje":          km,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return FileResponse(ROOT / "index.html")
