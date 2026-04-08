from datetime import timedelta

from telegram import Update
from telegram.ext import ContextTypes

from config import settings
from scheduler.jobs import monitor_job
from utils.logger import get_logger

logger = get_logger(__name__)


def _authorized(user_id: int) -> bool:
    return not settings.ALLOWED_USER_IDS or user_id in settings.ALLOWED_USER_IDS


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        await update.message.reply_text("Unauthorized.")
        return

    await update.message.reply_text(
        "Hi! I'm your AI agent powered by "
        f"{settings.LLM_PROVIDER.capitalize()}.\n\n"
        "Use /help to see what I can do."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        return

    await update.message.reply_text(
        "/start   — Welcome message\n"
        "/help    — This list\n"
        "/check [url] — Scrape & analyze a URL now\n"
        "/monitor — Toggle periodic monitoring on/off\n"
        "/status  — Show active jobs and next run time\n"
        "/clear   — Clear your conversation history\n\n"
        "Send any text to chat freely with the agent."
    )


async def check(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        return

    url = (context.args[0] if context.args else None) or settings.TARGET_URL
    if not url:
        await update.message.reply_text(
            "No URL configured. Usage: /check <url>\n"
            "Or set TARGET_URL in your .env file."
        )
        return

    await update.message.reply_text(f"Fetching {url} ...")

    scraper_fn = context.bot_data["scraper_fn"]
    agent = context.bot_data["agent"]

    try:
        content = await scraper_fn(url)
        response = await agent.run(
            user_id=update.effective_user.id,
            user_message=f"Analyze this page content from {url}:\n\n{content}",
        )
        await update.message.reply_text(response)
    except Exception as e:
        logger.error(f"/check failed for user {update.effective_user.id}: {e}", exc_info=True)
        await update.message.reply_text(f"Error: {e}")


async def monitor(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        return

    user_id = update.effective_user.id
    job_name = f"monitor_{user_id}"
    existing = context.job_queue.get_jobs_by_name(job_name)

    if existing:
        for job in existing:
            job.schedule_removal()
        await update.message.reply_text("Monitor deactivated.")
        logger.info(f"Monitor stopped for user {user_id}")
        return

    if not settings.TARGET_URL:
        await update.message.reply_text(
            "TARGET_URL is not configured in .env — cannot start monitor."
        )
        return

    interval = settings.SCRAPE_INTERVAL_MINUTES
    context.job_queue.run_repeating(
        callback=monitor_job,
        interval=timedelta(minutes=interval),
        first=10,
        name=job_name,
        chat_id=update.effective_chat.id,
        user_id=user_id,
    )
    await update.message.reply_text(
        f"Monitor activated. Checking every {interval} min.\n"
        f"URL: {settings.TARGET_URL}"
    )
    logger.info(f"Monitor started: user={user_id}, interval={interval}m, url={settings.TARGET_URL}")


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        return

    jobs = [j for j in context.job_queue.jobs() if j.name]
    if not jobs:
        await update.message.reply_text("No active jobs.")
        return

    lines = []
    for job in jobs:
        next_run = job.next_t.strftime("%Y-%m-%d %H:%M:%S") if job.next_t else "unknown"
        lines.append(f"- {job.name}  (next: {next_run})")

    await update.message.reply_text("Active jobs:\n" + "\n".join(lines))


async def clear(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        return

    memory = context.bot_data["memory"]
    await memory.clear_history(update.effective_user.id)
    await update.message.reply_text("Conversation history cleared.")
