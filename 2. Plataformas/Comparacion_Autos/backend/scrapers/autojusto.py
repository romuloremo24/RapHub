"""AutoJusto.cl scraper – HTML card parsing via curl_cffi (Cloudflare bypass)."""
from __future__ import annotations
import hashlib, logging
from typing import List, Optional
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://www.autojusto.cl"
SEARCH_URL = "https://www.autojusto.cl/venta-autos-usados/"


class AutoJustoScraper(BaseScraper):
    source_id   = "autojusto"
    source_name = "AutoJusto"

    def __init__(self):
        super().__init__()
        self._cf_session = cffi_requests.AsyncSession(impersonate="chrome120")

    async def __aexit__(self, *args):
        await self.client.aclose()
        await self._cf_session.close()

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        html = await self._fetch(SEARCH_URL)
        if not html:
            return []
        return self._parse(html, filters)

    async def _fetch(self, url: str) -> str:
        try:
            resp = await self._cf_session.get(url)
            if resp.status_code != 200:
                logger.warning("AutoJusto HTTP %s for %s", resp.status_code, url)
                return ""
            return resp.text
        except Exception as exc:
            logger.error("AutoJusto error: %s", exc)
            return ""

    def _parse(self, html: str, filters: SearchFilters) -> List[CarListing]:
        soup = BeautifulSoup(html, "lxml")
        results: List[CarListing] = []

        # Cards are plain <a> tags linking to vehicle detail pages
        cards = soup.select('a[href*="/ficha/vehiculo/"]')
        for card in cards:
            try:
                r = self._parse_card(card)
                if r and self.passes_filters(r, filters):
                    if filters.brand and r.brand:
                        if self._norm(filters.brand) not in self._norm(r.brand):
                            continue
                    if filters.model and r.model:
                        if self._norm(filters.model) not in self._norm(r.model):
                            continue
                    results.append(r)
            except Exception:
                continue

        return results[:filters.limit]

    def _parse_card(self, card) -> Optional[CarListing]:
        import re
        href = card.get("href", "")
        url  = href if href.startswith("http") else (BASE_URL + href if href.startswith("/") else SEARCH_URL)

        # Brand and model from URL: /ficha/vehiculo/{id}/{BRAND}/{MODEL}/
        brand: Optional[str] = None
        model: Optional[str] = None
        m = re.search(r"/ficha/vehiculo/\d+/([^/]+)/([^/]+)/", href)
        if m:
            brand = m.group(1).replace("_", " ").title()
            model = m.group(2).replace("_", " ").title()

        # <strong> elements: first = title text, second = price
        strongs = card.find_all("strong", recursive=False)
        if not strongs:
            strongs = card.select("strong")
        title_text = self.clean_str(strongs[0].get_text()) if strongs else None
        price      = self.parse_price(strongs[1].get_text() if len(strongs) > 1 else "")

        # Direct <div> children in order: year, fuel, km, transmission, location
        divs = card.find_all("div", recursive=False)
        year_text = divs[0].get_text(strip=True) if divs else ""
        year      = int(year_text) if year_text.isdigit() and 1970 <= int(year_text) <= 2030 else None
        fuel      = self.clean_str(divs[1].get_text()) if len(divs) > 1 else None
        km        = self.parse_km(divs[2].get_text()) if len(divs) > 2 else None
        trans     = self.clean_str(divs[3].get_text()) if len(divs) > 3 else None
        location  = self.clean_str(divs[4].get_text()) if len(divs) > 4 else None

        # Image: first <img> that is not a badge/logo
        image_url: Optional[str] = None
        for img in card.find_all("img"):
            src = img.get("src", "")
            if src and "garantizado" not in src and "logo" not in src.lower():
                image_url = src if src.startswith("http") else (BASE_URL + src if src.startswith("/") else None)
                break

        title = title_text or f"{brand or ''} {model or ''}".strip() or "Auto"
        uid   = hashlib.md5(url.encode()).hexdigest()[:10]

        return CarListing(
            id           = f"aj_{uid}",
            source       = self.source_id,
            title        = title,
            brand        = brand or None,
            model        = model or None,
            year         = year,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = "used",
            fuel_type    = fuel,
            transmission = trans,
            location     = location,
            image_url    = image_url,
            url          = url,
        )
