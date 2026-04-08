from bs4 import BeautifulSoup

from utils.logger import get_logger

logger = get_logger(__name__)

_SKIP_TAGS = frozenset({"script", "style", "noscript", "iframe", "head", "meta", "link"})


class Parser:
    def extract_text(self, html: str, max_chars: int = 8000) -> str:
        soup = BeautifulSoup(html, "lxml")

        for tag in soup(_SKIP_TAGS):
            tag.decompose()

        raw = soup.get_text(separator="\n", strip=True)
        lines = [line for line in raw.splitlines() if line.strip()]
        result = "\n".join(lines)

        if len(result) > max_chars:
            result = result[:max_chars] + f"\n... [truncated at {max_chars} chars]"

        return result

    def extract_links(self, html: str, base_url: str = "") -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        links = []
        for a in soup.find_all("a", href=True):
            href: str = a["href"]
            if href.startswith("http"):
                links.append({"text": a.get_text(strip=True), "url": href})
            elif base_url and href.startswith("/"):
                links.append(
                    {"text": a.get_text(strip=True), "url": base_url.rstrip("/") + href}
                )
        return links
