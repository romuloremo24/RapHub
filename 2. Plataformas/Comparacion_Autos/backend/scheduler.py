"""APScheduler – checks alerts hourly and runs full daily scrape at 3 AM."""
from __future__ import annotations
import json, logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import SessionLocal, Alert, User
from scrapers.manager import search_sources
from scrapers.base import SearchFilters
from email_sender import send_alert_email

logger    = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="America/Santiago")

FILTER_FIELDS = {
    "query", "brand", "model", "condition",
    "year_from", "year_to", "price_from", "price_to",
    "km_max", "fuel_type", "transmission", "region",
}


async def _check_alerts():
    logger.info("Scheduler: checking alerts")
    db = SessionLocal()
    try:
        alerts = db.query(Alert).filter(Alert.active == True).all()
        for alert in alerts:
            try:
                raw     = json.loads(alert.params)
                f_args  = {k: v for k, v in raw.items() if k in FILTER_FIELDS and v not in (None, "", [])}
                sources = raw.get("sources")   # list of source IDs or None (= all)
                filters = SearchFilters(**f_args, limit=100)

                result      = await search_sources(filters, sources)
                current_ids = {r["id"] for r in result["results"]}
                last_seen   = set(json.loads(alert.last_seen_ids or "[]"))

                new_ids = current_ids - last_seen
                if new_ids and last_seen:
                    new_cars = [r for r in result["results"] if r["id"] in new_ids]
                    user     = db.query(User).filter(User.id == alert.user_id).first()
                    if user:
                        await send_alert_email(user.email, alert.name, new_cars)
                        logger.info("Alert %d: %d new cars → %s", alert.id, len(new_cars), user.email)

                alert.last_seen_ids = json.dumps(list(current_ids))
                alert.last_run      = datetime.utcnow()
                db.commit()
            except Exception as exc:
                logger.error("Alert %d check failed: %s", alert.id, exc)
    finally:
        db.close()


async def _run_daily_scrape():
    try:
        from daily_job import run_full_scrape
        summary = await run_full_scrape()
        logger.info("Daily scrape finished: %d new rows", summary.get("total_new", 0))
    except Exception as exc:
        logger.error("Daily scrape job failed: %s", exc)


def start_scheduler():
    scheduler.add_job(_check_alerts, "interval", hours=1, id="check_alerts", replace_existing=True)
    scheduler.add_job(_run_daily_scrape, "cron", hour=3, minute=0, id="daily_scrape", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started (alerts: hourly, daily scrape: 03:00)")
