"""Daily full-catalog scraper – runs all 6 sources and stores results in price_history.db."""
from __future__ import annotations
import asyncio
import logging
import time
from datetime import date

from scrapers.base import SearchFilters
from scrapers.manager import SCRAPER_MAP
from history_db import insert_snapshots, log_scrape, init_history_db

logger = logging.getLogger(__name__)

# Sources included in the daily scrape (Facebook requires manual login first)
DAILY_SOURCES = ["chileautos", "yapo", "mercadolibre", "clicar", "kavak", "facebook"]

# Seconds to wait between scrapers to avoid rate limiting
_INTER_SCRAPER_DELAY = 3


async def run_full_scrape() -> dict:
    """
    Run all daily sources sequentially, insert into price_history.db.
    Returns a summary dict with counts and errors per source.
    """
    today = date.today().isoformat()
    logger.info("Daily scrape starting for %s", today)
    init_history_db()  # idempotent – creates tables if missing

    # No brand/model filter → scrape everything; max_pages=15 overrides scraper defaults
    filters = SearchFilters(limit=500, max_pages=15)

    summary: dict = {"date": today, "sources": {}, "total_new": 0}

    for source_id in DAILY_SOURCES:
        cls = SCRAPER_MAP.get(source_id)
        if not cls:
            logger.warning("Daily scrape: unknown source %s", source_id)
            continue

        t0 = time.monotonic()
        error: str | None = None
        scraped = 0
        stored = 0

        try:
            scraper = cls()
            async with scraper:
                results = await scraper.search(filters)
            scraped = len(results)
            listings = [r.to_dict() for r in results]
            stored = insert_snapshots(listings, today)
            logger.info("Daily scrape %s: scraped=%d new_stored=%d", source_id, scraped, stored)
        except Exception as exc:
            error = str(exc)
            logger.error("Daily scrape %s failed: %s", source_id, exc)

        duration = time.monotonic() - t0
        log_scrape(today, source_id, stored, error, duration)

        summary["sources"][source_id] = {
            "scraped":  scraped,
            "stored":   stored,
            "error":    error,
            "duration": round(duration, 1),
        }
        summary["total_new"] += stored

        # Polite delay between scrapers
        if source_id != DAILY_SOURCES[-1]:
            await asyncio.sleep(_INTER_SCRAPER_DELAY)

    logger.info(
        "Daily scrape complete: %d total new rows for %s", summary["total_new"], today
    )
    return summary
