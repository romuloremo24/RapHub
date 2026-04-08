"""Standalone scraper runner – no web server needed.
Run directly: python run_scrape.py
Or via Task Scheduler using run_scrape.bat
"""
import asyncio
import logging
import sys
from pathlib import Path

# Ensure the backend directory is in the Python path
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from daily_job import run_full_scrape
from history_db import get_snapshots_for_date
from export_excel import export_scrape_to_excel

if __name__ == "__main__":
    print("=" * 55)
    print("  RadarAuto – Scraper de historial de precios")
    print("=" * 55)
    summary = asyncio.run(run_full_scrape())
    print()
    print(f"Fecha:            {summary['date']}")
    print(f"Nuevos registros: {summary['total_new']}")
    print()
    print("Detalle por fuente:")
    for src, info in summary["sources"].items():
        if info["error"]:
            print(f"  {src:15} ERROR: {info['error'][:60]}")
        else:
            print(f"  {src:15} scraped={info['scraped']:4d}  stored={info['stored']:4d}  ({info['duration']}s)")

    # Export to Excel
    print()
    print("Generando Excel...")
    listings = get_snapshots_for_date(summary["date"])
    xlsx_path = export_scrape_to_excel(summary["date"], listings, summary)
    if xlsx_path:
        print(f"Excel guardado en: {xlsx_path}")
    else:
        print("No se generó Excel (sin datos o error).")
    print()
    print("Listo.")
