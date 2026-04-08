"""Price history database – stores daily snapshots from all scrapers."""
from __future__ import annotations
import logging
import sqlite3
import statistics
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "price_history.db"

_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS snapshots (
    listing_id   TEXT NOT NULL,
    source       TEXT NOT NULL,
    brand        TEXT,
    model        TEXT,
    year         INTEGER,
    km           INTEGER,
    price        REAL,
    currency     TEXT DEFAULT 'CLP',
    condition    TEXT,
    transmission TEXT,
    fuel_type    TEXT,
    title        TEXT,
    location     TEXT,
    url          TEXT,
    image_url    TEXT,
    scraped_date TEXT NOT NULL,
    PRIMARY KEY (listing_id, scraped_date)
);
CREATE INDEX IF NOT EXISTS idx_snap_brand_model ON snapshots(brand, model);
CREATE INDEX IF NOT EXISTS idx_snap_year        ON snapshots(year);
CREATE INDEX IF NOT EXISTS idx_snap_price       ON snapshots(price);
CREATE INDEX IF NOT EXISTS idx_snap_date        ON snapshots(scraped_date);
CREATE INDEX IF NOT EXISTS idx_snap_source      ON snapshots(source);

CREATE TABLE IF NOT EXISTS scrape_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_date    TEXT NOT NULL,
    source      TEXT NOT NULL,
    count       INTEGER DEFAULT 0,
    error       TEXT,
    duration_s  REAL,
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_log_date ON scrape_log(run_date);
"""


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=NORMAL")
    return c


def init_history_db():
    c = _conn()
    c.executescript(_CREATE_SQL)
    c.commit()
    c.close()
    logger.info("History DB ready at %s", DB_PATH)


def insert_snapshots(listings: list, scraped_date: str) -> int:
    """Bulk-insert (INSERT OR IGNORE) – idempotent daily runs."""
    if not listings:
        return 0
    c = _conn()
    inserted = 0
    try:
        cur = c.cursor()
        for r in listings:
            cur.execute(
                """INSERT OR IGNORE INTO snapshots
                   (listing_id, source, brand, model, year, km, price, currency,
                    condition, transmission, fuel_type, title, location, url, image_url, scraped_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    r.get("id"), r.get("source"),
                    r.get("brand"), r.get("model"),
                    r.get("year"), r.get("km"),
                    r.get("price"), r.get("currency", "CLP"),
                    r.get("condition"), r.get("transmission"),
                    r.get("fuel_type"), r.get("title"),
                    r.get("location"), r.get("url"), r.get("image_url"),
                    scraped_date,
                ),
            )
            inserted += cur.rowcount
        c.commit()
    finally:
        c.close()
    return inserted


def log_scrape(run_date: str, source: str, count: int, error: Optional[str], duration_s: float):
    c = _conn()
    try:
        c.execute(
            "INSERT INTO scrape_log (run_date, source, count, error, duration_s) VALUES (?,?,?,?,?)",
            (run_date, source, count, error, round(duration_s, 2)),
        )
        c.commit()
    finally:
        c.close()


def get_price_history(
    brand: str,
    model: str,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
) -> list:
    """Daily aggregated prices for a brand+model combination."""
    c = _conn()
    try:
        conds = ["LOWER(brand) LIKE LOWER(?)", "LOWER(model) LIKE LOWER(?)", "price IS NOT NULL"]
        params: list = [f"%{brand}%", f"%{model}%"]
        if year_from:
            conds.append("year >= ?")
            params.append(year_from)
        if year_to:
            conds.append("year <= ?")
            params.append(year_to)
        where = " AND ".join(conds)
        rows = c.execute(
            f"""SELECT scraped_date,
                       COUNT(*)         AS count,
                       ROUND(AVG(price))  AS avg_price,
                       MIN(price)         AS min_price,
                       MAX(price)         AS max_price
                FROM snapshots
                WHERE {where}
                GROUP BY scraped_date
                ORDER BY scraped_date""",
            params,
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        c.close()


def get_market_stats(
    brand: str,
    model: str,
    year: Optional[int] = None,
    km_max: Optional[int] = None,
) -> dict:
    """Market stats using the last 30 days of scraped data."""
    c = _conn()
    try:
        since = (date.today() - timedelta(days=30)).isoformat()
        conds = [
            "LOWER(brand) LIKE LOWER(?)",
            "LOWER(model) LIKE LOWER(?)",
            "price IS NOT NULL",
            "scraped_date >= ?",
        ]
        params: list = [f"%{brand}%", f"%{model}%", since]
        if year:
            conds.append("year = ?")
            params.append(year)
        if km_max:
            conds.append("(km IS NULL OR km <= ?)")
            params.append(km_max)
        where = " AND ".join(conds)
        rows = c.execute(
            f"SELECT price, km, year, scraped_date FROM snapshots WHERE {where} ORDER BY price",
            params,
        ).fetchall()
        if not rows:
            return {}
        prices = [r["price"] for r in rows]
        n = len(prices)
        return {
            "count":  n,
            "avg":    round(statistics.mean(prices)),
            "median": round(statistics.median(prices)),
            "min":    round(min(prices)),
            "max":    round(max(prices)),
            "p25":    round(prices[n // 4]),
            "p75":    round(prices[3 * n // 4]),
        }
    finally:
        c.close()


def get_snapshots_for_date(run_date: str) -> list:
    """Return all snapshots stored on a given date (for Excel export)."""
    c = _conn()
    try:
        rows = c.execute(
            """SELECT listing_id, source, brand, model, year, km, price, currency,
                      condition, transmission, fuel_type, title, location, url, image_url, scraped_date
               FROM snapshots WHERE scraped_date = ? ORDER BY source, brand, model, year""",
            (run_date,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        c.close()


def get_history_listings(
    brand: str,
    model: str,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    km_max: Optional[int] = None,
    limit: int = 1000,
) -> list:
    """
    Return unique listings (latest snapshot per listing_id) for scatter-plot analysis.
    SQLite MIN/MAX guarantee: non-aggregated columns come from the MAX(scraped_date) row.
    """
    c = _conn()
    try:
        conds = ["LOWER(brand) LIKE LOWER(?)", "LOWER(model) LIKE LOWER(?)", "price IS NOT NULL"]
        params: list = [f"%{brand}%", f"%{model}%"]
        if year_from:
            conds.append("year >= ?")
            params.append(year_from)
        if year_to:
            conds.append("year <= ?")
            params.append(year_to)
        if km_max:
            conds.append("(km IS NULL OR km <= ?)")
            params.append(km_max)
        where = " AND ".join(conds)
        rows = c.execute(
            f"""SELECT listing_id, source, brand, model, year, km, price,
                       title, url, MAX(scraped_date) AS scraped_date
                FROM snapshots
                WHERE {where}
                GROUP BY listing_id
                ORDER BY price
                LIMIT ?""",
            params + [limit],
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        c.close()


def get_best_deals(
    brand: Optional[str] = None,
    model: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    km_max: Optional[int] = None,
    days: int = 60,
    limit: int = 20,
) -> list:
    """
    Return listings priced significantly below their year-adjusted median.
    Uses last `days` days of scraped data.  Results are sorted by deal_score
    (price savings % relative to year peers), best deals first.
    """
    from collections import defaultdict

    c = _conn()
    try:
        since = (date.today() - timedelta(days=days)).isoformat()
        conds = ["price IS NOT NULL", "scraped_date >= ?"]
        params: list = [since]
        if brand:
            conds.append("LOWER(brand) LIKE LOWER(?)")
            params.append(f"%{brand}%")
        if model:
            conds.append("LOWER(model) LIKE LOWER(?)")
            params.append(f"%{model}%")
        if year_from:
            conds.append("year >= ?")
            params.append(year_from)
        if year_to:
            conds.append("year <= ?")
            params.append(year_to)
        if km_max:
            conds.append("(km IS NULL OR km <= ?)")
            params.append(km_max)
        where = " AND ".join(conds)

        # Latest snapshot per listing within the window
        rows = c.execute(
            f"""SELECT listing_id, source, brand, model, year, km, price,
                       title, url, image_url, MAX(scraped_date) AS scraped_date
                FROM snapshots
                WHERE {where}
                GROUP BY listing_id
                HAVING price IS NOT NULL""",
            params,
        ).fetchall()
    finally:
        c.close()

    if not rows:
        return []

    listings = [dict(r) for r in rows]

    # Build year-band medians
    year_prices: dict = defaultdict(list)
    year_kms: dict    = defaultdict(list)
    for r in listings:
        y = r.get("year")
        p = r.get("price")
        k = r.get("km")
        if y and p:
            year_prices[y].append(p)
        if y and k and k > 0:
            year_kms[y].append(k)

    year_med_price = {y: statistics.median(ps) for y, ps in year_prices.items() if len(ps) >= 3}
    year_med_km    = {y: statistics.median(ks) for y, ks in year_kms.items()    if len(ks) >= 3}

    global_prices = [r["price"] for r in listings if r.get("price")]
    global_median = statistics.median(global_prices) if global_prices else None

    def _ref_price(year):
        if year:
            for delta in range(3):
                candidates = [year_med_price[y] for y in (year - delta, year, year + delta)
                               if y in year_med_price]
                if candidates:
                    return statistics.median(candidates)
        return global_median

    scored = []
    for r in listings:
        price = r.get("price")
        if not price:
            continue
        year = r.get("year")
        ref  = _ref_price(year)
        if not ref:
            continue

        diff = (price - ref) / ref
        # Only include listings at least 5% below year median
        if diff >= -0.05:
            continue

        km = r.get("km")
        pc = max(0.0, min(100.0, 50.0 - diff * 250.0))
        kc = 50.0
        if km and year and year in year_med_km:
            med_km = year_med_km[year]
            if med_km > 0:
                km_diff = (km - med_km) / med_km
                kc = max(0.0, min(100.0, 50.0 - km_diff * 100.0))

        r["price_diff_pct"] = round(diff * 100, 1)
        r["year_median"]    = round(ref)
        r["deal_score"]     = round(pc * 0.6 + kc * 0.4)
        scored.append(r)

    scored.sort(key=lambda x: x["deal_score"], reverse=True)
    return scored[:limit]


def get_scrape_log(days: int = 14) -> list:
    """Return the recent scrape log for the admin panel."""
    c = _conn()
    try:
        since = (date.today() - timedelta(days=days)).isoformat()
        rows = c.execute(
            """SELECT run_date, source, count, error, duration_s, created_at
               FROM scrape_log WHERE run_date >= ? ORDER BY created_at DESC LIMIT 200""",
            (since,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        c.close()
