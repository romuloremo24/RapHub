"""Base scraper class with shared utilities."""
from __future__ import annotations
import re
import logging
import httpx
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional
from tenacity import AsyncRetrying, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-CL,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


@dataclass
class CarListing:
    id: str
    source: str                   # mercadolibre | chileautos | kavak | yapo
    title: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    km: Optional[int] = None
    price: Optional[float] = None
    currency: str = "CLP"         # CLP | USD | UF
    condition: Optional[str] = None   # new | used
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    doors: Optional[int] = None
    engine: Optional[str] = None
    image_url: Optional[str] = None
    url: str = ""
    description: Optional[str] = None
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None or k in ("price", "km")}


@dataclass
class SearchFilters:
    query: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    condition: Optional[str] = None    # new | used | ""
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    price_from: Optional[float] = None
    price_to: Optional[float] = None
    km_max: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    region: Optional[str] = None
    limit: int = 48
    offset: int = 0
    max_pages: int = 0   # 0 = use scraper default; >0 overrides (used by daily job)


class BaseScraper(ABC):
    source_id: str = ""
    source_name: str = ""

    def __init__(self):
        self.client = httpx.AsyncClient(
            headers=HEADERS,
            timeout=20.0,
            follow_redirects=True,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.client.aclose()

    @abstractmethod
    async def search(self, filters: SearchFilters) -> List[CarListing]:
        ...

    async def _get_html(self, url: str, params: dict | None = None) -> str:
        """Fetch HTML with up to 3 retries on network/timeout errors."""
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=8),
            retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
            reraise=True,
        ):
            with attempt:
                resp = await self.client.get(url, params=params)
                if resp.status_code >= 500:
                    raise httpx.RemoteProtocolError(
                        f"Server returned {resp.status_code}", request=resp.request
                    )
                return resp.text
        raise RuntimeError("unreachable")

    # ── Utility helpers ──────────────────────────────────────────────────────

    @staticmethod
    def parse_price(raw: str) -> Optional[float]:
        """Parse a price string like '$12.500.000' → 12500000.0"""
        if not raw:
            return None
        raw = str(raw).replace("\xa0", "").replace(" ", "")
        # Remove currency symbols and thousands separators
        digits = re.sub(r"[^\d,.]", "", raw)
        # Chilean format: 12.500.000 (dots as thousands)
        digits = digits.replace(".", "").replace(",", ".")
        try:
            return float(digits)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def parse_km(raw: str) -> Optional[int]:
        if not raw:
            return None
        digits = re.sub(r"[^\d]", "", str(raw))
        try:
            return int(digits)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def parse_year(raw: str) -> Optional[int]:
        if not raw:
            return None
        m = re.search(r"\b(19[6-9]\d|20[0-2]\d)\b", str(raw))
        if m:
            return int(m.group(0))
        return None

    @staticmethod
    def clean_str(s: Optional[str]) -> Optional[str]:
        if not s:
            return None
        return " ".join(str(s).split()).strip() or None

    # ── Shared filter helper ──────────────────────────────────────────────────

    @staticmethod
    def _norm(s: str) -> str:
        """Normalize brand/model names: strip separators and lowercase for fuzzy matching.
        'X-Trail' → 'xtrail', 'CX-5' → 'cx5', 'Grand i10' → 'grandi10'
        """
        return re.sub(r"[\s\-\._]+", "", s).lower()

    @classmethod
    def passes_filters(cls, r: "CarListing", f: "SearchFilters") -> bool:
        if f.brand and r.brand and cls._norm(f.brand) not in cls._norm(r.brand): return False
        if f.model and r.model and cls._norm(f.model) not in cls._norm(r.model): return False
        if f.year_from  and r.year  and r.year  < f.year_from:  return False
        if f.year_to    and r.year  and r.year  > f.year_to:    return False
        if f.km_max     and r.km    and r.km    > f.km_max:     return False
        if f.price_from and r.price and r.price < f.price_from: return False
        if f.price_to   and r.price and r.price > f.price_to:   return False
        if f.condition  and r.condition and f.condition != r.condition: return False
        return True

    # ── Shared HTML card parser ───────────────────────────────────────────────

    @staticmethod
    def _img_from_el(el) -> Optional[str]:
        if not el:
            return None
        for attr in ("src", "data-src", "data-lazy", "data-original"):
            v = el.get(attr, "")
            if v and "placeholder" not in v.lower() and "data:image" not in v:
                return ("https:" + v) if v.startswith("//") else v
        return None

    def parse_generic_card(self, card, base_url: str, prefix: str) -> Optional["CarListing"]:
        import hashlib, re
        title_el = card.select_one(
            "h1,h2,h3,.title,[class*='title'],[class*='name'],[class*='heading']"
        )
        title = self.clean_str(title_el.get_text() if title_el else "")
        if not title:
            return None

        price_el = card.select_one(
            "[class*='price'],[class*='precio'],[data-price],[class*='value']"
        )
        price = self.parse_price(price_el.get_text() if price_el else "")

        full = card.get_text(" ", strip=True)
        year = self.parse_year(full)
        km_m = re.search(r"([\d][.\d]*\d)\s*km", full, re.IGNORECASE)
        km   = self.parse_km(km_m.group(1)) if km_m else None

        link_el = card.select_one("a[href]")
        url = ""
        if link_el:
            href = link_el.get("href", "")
            url = (base_url + href) if href.startswith("/") else href

        img_el = card.select_one("img")
        image_url = self._img_from_el(img_el)

        uid = hashlib.md5((url or title).encode()).hexdigest()[:10]
        return CarListing(
            id=f"{prefix}_{uid}", source=prefix,
            title=title, year=year, km=km, price=price,
            currency="CLP", image_url=image_url, url=url,
        )

    # ── Embedded JSON extractor (Next.js / Nuxt / generic) ────────────────────

    @staticmethod
    def extract_page_json(html: str) -> Optional[dict]:
        import json, re
        patterns = [
            r'<script id="__NEXT_DATA__"[^>]*>({.+?})</script>',
            r'window\.__NUXT__\s*=\s*(.+?);\s*</script>',
            r'window\.__INITIAL_STATE__\s*=\s*({.+?});\s*</script>',
            r'window\.__APP_STATE__\s*=\s*({.+?});\s*</script>',
            r'window\.initialState\s*=\s*({.+?});\s*</script>',
        ]
        for pat in patterns:
            m = re.search(pat, html, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    continue
        return None
