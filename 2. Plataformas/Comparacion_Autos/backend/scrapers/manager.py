"""Scraper manager – runs multiple scrapers and merges results."""
from __future__ import annotations
import asyncio
import logging
import re
import statistics
from collections import defaultdict
from typing import Dict, List

from .base import CarListing, SearchFilters
from .mercadolibre import MercadoLibreScraper
from .chileautos   import ChileAutosScraper
from .kavak        import KavakScraper
from .yapo         import YapoScraper
from .autocosmos   import AutoCosmosScraper
from .autosusados  import AutosUsadosScraper
from .autocl       import AutoClScraper
from .clicar       import ClicarScraper
from .gildemeister import GildemeisterScraper
from .autojusto    import AutoJustoScraper
from .economicos   import EconomicosScraper
from .facebook     import FacebookMarketplaceScraper

logger = logging.getLogger(__name__)


def _annotate_listings(deduped: List[dict], market_median: float | None) -> None:
    """
    Annotate each listing with price_score, price_diff_pct, and deal_score.

    price_score uses year-adjusted medians so a 2015 car is not compared
    against 2022 cars. deal_score (0-100) combines price and km context:
    higher = better deal.
    """
    if not market_median:
        return

    # Build per-year price and km distributions
    year_prices: dict = defaultdict(list)
    year_kms: dict    = defaultdict(list)
    for r in deduped:
        y = r.get("year")
        p = r.get("price")
        k = r.get("km")
        if y and p:
            year_prices[y].append(p)
        if y and k and k > 0:
            year_kms[y].append(k)

    # Median price per year (only when >= 2 data points for reliability)
    year_med_price: dict = {
        y: statistics.median(ps) for y, ps in year_prices.items() if len(ps) >= 2
    }
    year_med_km: dict = {
        y: statistics.median(ks) for y, ks in year_kms.items() if len(ks) >= 2
    }

    def _ref_price(year):
        """Best year-band reference price (exact → ±1 → ±2 → global)."""
        if year:
            for delta in range(3):
                candidates = [year_med_price[y] for y in (year - delta, year, year + delta)
                               if y in year_med_price]
                if candidates:
                    return statistics.median(candidates)
        return market_median

    for r in deduped:
        price = r.get("price")
        if not price:
            continue
        year = r.get("year")
        ref  = _ref_price(year)

        # Price component: % above/below year-adjusted median
        diff = (price - ref) / ref
        r["price_diff_pct"] = round(diff * 100, 1)
        r["price_score"] = "bajo" if diff < -0.10 else ("alto" if diff > 0.10 else "justo")

        # Price component 0-100 (100 = 20%+ below ref, 50 = at ref, 0 = 20%+ above ref)
        pc = max(0.0, min(100.0, 50.0 - diff * 250.0))

        # KM component 0-100 (100 = 50%+ fewer km than year median, 50 = at median)
        kc = 50.0
        km = r.get("km")
        if km and year and year in year_med_km:
            med_km = year_med_km[year]
            if med_km > 0:
                km_diff = (km - med_km) / med_km
                kc = max(0.0, min(100.0, 50.0 - km_diff * 100.0))

        # deal_score: 60 % price quality + 40 % km quality
        r["deal_score"] = round(pc * 0.6 + kc * 0.4)


SCRAPER_MAP = {
    "mercadolibre": MercadoLibreScraper,
    "chileautos":   ChileAutosScraper,
    "kavak":        KavakScraper,
    "yapo":         YapoScraper,
    "autocosmos":   AutoCosmosScraper,
    "autosusados":  AutosUsadosScraper,
    "autocl":       AutoClScraper,
    "clicar":       ClicarScraper,
    "gildemeister": GildemeisterScraper,
    "autojusto":    AutoJustoScraper,
    "economicos":   EconomicosScraper,
    "facebook":     FacebookMarketplaceScraper,
}

SOURCE_INFO = {
    "mercadolibre": {"name": "MercadoLibre",       "color": "#FFE600", "text": "#333"},
    "chileautos":   {"name": "ChileAutos",          "color": "#E63946", "text": "#fff"},
    "kavak":        {"name": "Kavak",               "color": "#00C07F", "text": "#fff"},
    "yapo":         {"name": "Yapo.cl",             "color": "#FF6B35", "text": "#fff"},
    "autocosmos":   {"name": "AutoCosmos",          "color": "#1565C0", "text": "#fff"},
    "autosusados":  {"name": "AutosUsados",         "color": "#7B1FA2", "text": "#fff"},
    "autocl":       {"name": "Auto.cl",             "color": "#00838F", "text": "#fff"},
    "clicar":       {"name": "Clicar",              "color": "#C62828", "text": "#fff"},
    "gildemeister": {"name": "Gildemeister Usados", "color": "#01579B", "text": "#fff"},
    "autojusto":    {"name": "AutoJusto",           "color": "#558B2F", "text": "#fff"},
    "economicos":   {"name": "Económicos",          "color": "#4E342E", "text": "#fff"},
    "facebook":     {"name": "Facebook Marketplace","color": "#1877F2", "text": "#fff"},
}


async def search_sources_stream(
    filters: SearchFilters,
    sources: List[str] | None = None,
):
    """Async generator: yields progress events as scrapers finish, then final results.
    Yields tuples of (event_type, data_dict).
    event_type = "progress"  → one source finished
    event_type = "done"      → all sources done, data contains merged results
    """
    if sources is None:
        sources = list(SCRAPER_MAP.keys())

    total = len(sources)

    async def _run(source_id: str):
        cls = SCRAPER_MAP.get(source_id)
        if not cls:
            return source_id, [], None
        scraper = cls()
        try:
            async with scraper:
                results = await scraper.search(filters)
            return source_id, results, None
        except Exception as exc:
            logger.exception("Scraper %s failed: %s", source_id, exc)
            return source_id, [], str(exc)

    tasks = {asyncio.create_task(_run(s)): s for s in sources}
    pending = set(tasks.keys())
    completed = 0
    all_listings: List[dict] = []
    source_status: Dict[str, dict] = {}

    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            source_id, listings, error = task.result()
            completed += 1
            progress = round(completed / total * 100)
            info = SOURCE_INFO.get(source_id, {})
            source_status[source_id] = {
                "name":  info.get("name", source_id),
                "count": len(listings),
                "error": error,
                "ok":    error is None,
            }
            for listing in listings:
                all_listings.append(listing.to_dict())

            yield "progress", {
                "source":        source_id,
                "name":          info.get("name", source_id),
                "count":         len(listings),
                "error":         error,
                "progress":      progress,
                "completed":     completed,
                "total_sources": total,
            }

    # Dedup + sort + market stats (same logic as search_sources)
    def _dedup_key(r: dict) -> str:
        title = re.sub(r"[\s\-\._]+", "", (r.get("title") or "")).lower()[:35]
        year  = r.get("year") or 0
        price = round((r.get("price") or 0) / 50000)
        return f"{title}_{year}_{price}"

    seen_keys: set = set()
    deduped: List[dict] = []
    for listing in all_listings:
        key = _dedup_key(listing)
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(listing)

    deduped.sort(key=lambda x: (x.get("price") is None, x.get("price") or 0))

    prices = [r["price"] for r in deduped if r.get("price")]
    market_avg    = round(statistics.mean(prices))   if prices else None
    market_median = round(statistics.median(prices)) if prices else None

    _annotate_listings(deduped, market_median)

    yield "done", {
        "total":         len(deduped),
        "results":       deduped,
        "sources":       source_status,
        "market_avg":    market_avg,
        "market_median": market_median,
    }


async def search_sources(
    filters: SearchFilters,
    sources: List[str] | None = None,
) -> Dict:
    """
    Run all requested scrapers concurrently and return merged results.
    sources: list of source_ids to query. None = all.
    """
    if sources is None:
        sources = list(SCRAPER_MAP.keys())

    async def _run(source_id: str):
        cls = SCRAPER_MAP.get(source_id)
        if not cls:
            return source_id, [], None
        scraper = cls()
        try:
            async with scraper:
                results = await scraper.search(filters)
            return source_id, results, None
        except Exception as exc:
            logger.exception("Scraper %s failed: %s", source_id, exc)
            return source_id, [], str(exc)

    tasks = [_run(s) for s in sources]
    raw   = await asyncio.gather(*tasks, return_exceptions=False)

    all_listings: List[dict] = []
    source_status: Dict[str, dict] = {}

    for source_id, listings, error in raw:
        source_status[source_id] = {
            "name":  SOURCE_INFO.get(source_id, {}).get("name", source_id),
            "count": len(listings),
            "error": error,
            "ok":    error is None,
        }
        for listing in listings:
            all_listings.append(listing.to_dict())

    # Cross-source deduplication: same normalized title + year + rounded price
    def _dedup_key(r: dict) -> str:
        title = re.sub(r"[\s\-\._]+", "", (r.get("title") or "")).lower()[:35]
        year  = r.get("year") or 0
        price = round((r.get("price") or 0) / 50000)  # bucket to nearest 50k CLP
        return f"{title}_{year}_{price}"

    seen_keys: set = set()
    deduped: List[dict] = []
    for listing in all_listings:
        key = _dedup_key(listing)
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(listing)
        else:
            logger.debug("Cross-source duplicate removed: %s", listing.get("title", "")[:40])

    # Sort by price ascending, listings without price go to end
    deduped.sort(key=lambda x: (x.get("price") is None, x.get("price") or 0))

    # Market intelligence: compute price stats and annotate each listing
    prices = [r["price"] for r in deduped if r.get("price")]
    market_avg    = round(statistics.mean(prices))    if prices else None
    market_median = round(statistics.median(prices))  if prices else None

    _annotate_listings(deduped, market_median)

    return {
        "total":          len(deduped),
        "results":        deduped,
        "sources":        source_status,
        "market_avg":     market_avg,
        "market_median":  market_median,
    }
