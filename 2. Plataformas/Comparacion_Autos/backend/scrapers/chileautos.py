"""ChileAutos.cl scraper – HTML parsing via /vehiculos/{brand}/ path."""
from __future__ import annotations
import hashlib, logging, re
from typing import List, Optional
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL  = "https://www.chileautos.cl"
PAGE_SIZE = 12   # offset step (first page has 16 due to GTS slots, rest have 12)
MAX_PAGES = 25


class ChileAutosScraper(BaseScraper):
    source_id   = "chileautos"
    source_name = "ChileAutos"

    def __init__(self):
        super().__init__()
        self._cf_session = cffi_requests.AsyncSession(impersonate="chrome120")

    async def __aexit__(self, *args):
        await self.client.aclose()
        await self._cf_session.close()

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        brand_slug = (filters.brand or "").lower().replace(" ", "-")

        if brand_slug:
            path = f"/vehiculos/{brand_slug}/"
            if filters.model:
                model_slug = filters.model.lower().replace(" ", "-")
                path += f"{model_slug}/"
        else:
            path = "/vehiculos/"

        url = BASE_URL + path
        results: List[CarListing] = []
        seen_ids: set = set()

        for page in range(filters.max_pages or MAX_PAGES):
            req_params: dict = {"offset": page * PAGE_SIZE} if page > 0 else {}
            if not brand_slug and filters.query:
                req_params["q"] = filters.query
            try:
                resp = await self._cf_session.get(url, params=req_params)
                if resp.status_code != 200:
                    logger.warning("ChileAutos HTTP %s page %d", resp.status_code, page + 1)
                    break
                html = resp.text
            except Exception as exc:
                logger.error("ChileAutos error: %s", exc)
                break

            new_found = 0
            for card in self._parse_page(html, filters):
                if card.id not in seen_ids:
                    seen_ids.add(card.id)
                    results.append(card)
                    new_found += 1

            logger.info("ChileAutos page %d: +%d (total %d)", page + 1, new_found, len(results))
            if new_found == 0:
                break

        return results

    def _parse_page(self, html: str, filters: SearchFilters) -> List[CarListing]:
        soup = BeautifulSoup(html, "lxml")
        results = []
        for card in soup.select(".listing-item[data-webm-make]"):
            try:
                r = self._parse_card(card)
                if r and self.passes_filters(r, filters):
                    results.append(r)
            except Exception:
                continue
        return results

    def _parse_card(self, card) -> Optional[CarListing]:
        uid      = card.get("id", "")
        brand    = self.clean_str(card.get("data-webm-make"))
        model    = self.clean_str(card.get("data-webm-model"))
        location = self.clean_str(card.get("data-webm-state"))

        price_raw = card.get("data-webm-price", "")
        try:
            price = float(price_raw) if price_raw else None
        except ValueError:
            price = None

        body = card.select_one(".card-body")
        if body is None:
            return None

        title_el = body.select_one("h3 a, a[data-webm-clickvalue='sv-title']")
        if title_el is None:
            return None
        title = self.clean_str(title_el.get_text())
        if not title:
            return None

        href = title_el.get("href", "")
        url  = (BASE_URL + href) if href.startswith("/") else href

        year_m = re.match(r"^(\d{4})\s", title)
        year   = int(year_m.group(1)) if year_m else None

        km, transmission, fuel_type = None, None, None
        for li in body.select("li.key-details__value"):
            dtype = li.get("data-type", "")
            text  = li.get_text(strip=True)
            if dtype == "Odometer":
                km = self.parse_km(text)
            elif dtype == "Transmission":
                transmission = text
            elif dtype == "Fuel Type":
                fuel_type = text

        image_url = None
        img = card.select_one(".card-header img[src], .card-header img[data-src]")
        if img:
            src = img.get("src") or img.get("data-src") or ""
            if src and "data:image" not in src:
                image_url = ("https:" + src) if src.startswith("//") else src

        title_lower = (title or "").lower()
        if "0 km" in title_lower or "nuevo" in title_lower:
            condition = "new"
        elif km == 0:
            condition = "new"
        else:
            condition = "used"

        return CarListing(
            id           = f"ca_{uid or hashlib.md5(url.encode()).hexdigest()[:10]}",
            source       = self.source_id,
            title        = title,
            brand        = brand,
            model        = model,
            year         = year,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = condition,
            transmission = transmission,
            fuel_type    = fuel_type,
            location     = location,
            image_url    = image_url,
            url          = url,
        )
