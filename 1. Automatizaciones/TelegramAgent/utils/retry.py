import asyncio
import random
from functools import wraps

from utils.logger import get_logger

logger = get_logger(__name__)


def async_retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    jitter = random.uniform(0, delay * 0.3)
                    wait = delay + jitter
                    logger.warning(
                        f"{func.__qualname__} failed (attempt {attempt}/{max_attempts}): "
                        f"{type(e).__name__}: {e}. Retrying in {wait:.1f}s"
                    )
                    await asyncio.sleep(wait)

        return wrapper

    return decorator
