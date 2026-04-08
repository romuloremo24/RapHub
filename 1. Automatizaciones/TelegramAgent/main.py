import os

from telegram.ext import (
    AIORateLimiter,
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
)

from agent.agent import Agent
from agent.llm_client import create_llm_client
from agent.memory import ConversationMemory
from bot.handlers.commands import check, clear, help_command, monitor, start, status
from bot.handlers.errors import error_handler
from bot.handlers.messages import handle_message
from config import settings
from scraper.fetcher import Fetcher
from scraper.parser import Parser
from utils.logger import get_logger

logger = get_logger(__name__)


def main() -> None:
    os.makedirs("data", exist_ok=True)

    # --- Build core components ---
    llm_client = create_llm_client(settings.LLM_PROVIDER)
    memory = ConversationMemory(settings.DB_PATH)
    fetcher = Fetcher()
    parser = Parser()

    async def scrape_url(url: str) -> str:
        html = await fetcher.fetch(url)
        return parser.extract_text(html)

    agent = Agent(
        llm=llm_client,
        memory=memory,
        tools={"scrape_url": scrape_url},
    )

    # --- Initialize memory on startup ---
    async def _post_init(application) -> None:
        await application.bot_data["memory"].initialize()
        logger.info("Memory initialized")

    # --- Build the Application ---
    app = (
        ApplicationBuilder()
        .token(settings.TELEGRAM_BOT_TOKEN)
        .rate_limiter(AIORateLimiter(max_retries=3))
        .post_init(_post_init)
        .build()
    )

    app.bot_data.update(
        {
            "llm_client": llm_client,
            "memory": memory,
            "agent": agent,
            "scraper_fn": scrape_url,
            "target_url": settings.TARGET_URL,
        }
    )

    # --- Register handlers ---
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("check", check))
    app.add_handler(CommandHandler("monitor", monitor))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("clear", clear))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)

    logger.info(
        f"Starting bot | provider={settings.LLM_PROVIDER} | "
        f"allowed_users={settings.ALLOWED_USER_IDS or 'all'}"
    )
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
