import asyncio
import traceback

from telegram.error import Forbidden, NetworkError, RetryAfter, TelegramError
from telegram.ext import ContextTypes

from utils.logger import get_logger

logger = get_logger(__name__)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    error = context.error

    if isinstance(error, RetryAfter):
        logger.warning(f"Telegram rate limit. Retry after {error.retry_after}s")
        await asyncio.sleep(error.retry_after)
        return

    if isinstance(error, NetworkError):
        logger.warning(f"Telegram network error (transient): {error}")
        return

    if isinstance(error, Forbidden):
        logger.warning(f"Bot blocked by user: {error}")
        return

    if isinstance(error, TelegramError):
        logger.error(f"TelegramError: {error}")
        return

    tb = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    logger.error(f"Unhandled exception for update {update!r}:\n{tb}")
