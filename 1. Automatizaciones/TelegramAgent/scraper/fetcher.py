import httpx

from utils.logger import get_logger
from utils.retry import async_retry

logger = get_logger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
}


class Fetcher:
    def __init__(self, timeout: float = 30.0) -> None:
        self._timeout = timeout

    @async_retry(max_attempts=3, base_delay=2.0)
    async def fetch(self, url: str) -> str:
        async with httpx.AsyncClient(
            headers=_HEADERS,
            timeout=self._timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            logger.debug(f"Fetched {url} ({len(response.text):,} chars)")
            return response.text
