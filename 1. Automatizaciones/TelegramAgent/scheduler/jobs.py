from datetime import datetime

from telegram.ext import CallbackContext

from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

_ANALYSIS_PROMPT = """\
You are monitoring a web page for relevant changes or important information.

URL: {url}
Scraped at: {timestamp}

Content:
{content}

Task: Analyze the content above. Is there anything notable, new, or important that \
a user monitoring this page should know about?
If yes, provide a concise summary (2-4 sentences).
If nothing notable, respond with exactly: NO_NOTIFICATION

Be selective — only notify for genuinely useful information.\
"""


async def monitor_job(context: CallbackContext) -> None:
    """Periodic job: scrape TARGET_URL, analyze with LLM, notify if relevant."""
    job = context.job
    chat_id = job.chat_id
    llm_client = context.bot_data.get("llm_client")
    scraper_fn = context.bot_data.get("scraper_fn")
    url = context.bot_data.get("target_url") or settings.TARGET_URL

    if not url:
        logger.warning("monitor_job: TARGET_URL not set, skipping")
        return

    if llm_client is None or scraper_fn is None:
        logger.error("monitor_job: missing llm_client or scraper_fn in bot_data")
        return

    logger.info(f"monitor_job: scraping {url} for chat_id={chat_id}")

    try:
        content = await scraper_fn(url)
        if not content.strip():
            logger.warning("monitor_job: empty content, skipping")
            return

        prompt = _ANALYSIS_PROMPT.format(
            url=url,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            content=content,
        )

        text, _ = await llm_client.chat(
            messages=[{"role": "user", "content": prompt}]
        )

        if not text or text.strip() == "NO_NOTIFICATION":
            logger.info("monitor_job: nothing notable found, no notification sent")
            return

        await context.bot.send_message(
            chat_id=chat_id,
            text=f"Monitor ({url}):\n\n{text}",
        )
        logger.info(f"monitor_job: notification sent to chat_id={chat_id}")

    except Exception as e:
        logger.error(f"monitor_job failed: {e}", exc_info=True)
