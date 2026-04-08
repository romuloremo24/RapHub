"""Auto.cl scraper – cachedGetPublications JSON API (curl_cffi Cloudflare bypass)."""
from __future__ import annotations
import hashlib, logging, math
from typing import List, Optional
from curl_cffi import requests as cffi_requests
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL = "https://www.auto.cl"
API_URL  = "https://api.auto.cl/cachedGetPublications"

_FUEL_MAP = {
    "gasoline": "Gasolina", "gas": "Gasolina", "petrol": "Gasolina",
    "diesel": "Diésel", "electric": "Eléctrico", "hybrid": "Híbrido",
    "pluginhybrid": "Híbrido Enchufable", "gnc": "GNC",
}
_TRANS_MAP = {
    "manual": "Manual", "automatico": "Automático", "automatic": "Automático",
    "cvt": "CVT", "automatica": "Automático",
}


class AutoClScraper(BaseScraper):
    source_id   = "autocl"
    source_name = "Auto.cl"

    def __init__(self):
        super().__init__()
        self._cf_session = cffi_requests.AsyncSession(impersonate="chrome120")

    async def __aexit__(self, *args):
        await self.client.aclose()
        await self._cf_session.close()

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        results: List[CarListing] = []
        pages_needed = math.ceil(filters.limit / 18) + 1

        for page in range(1, pages_needed + 1):
            params: dict = {"condition": "used", "page": page}
            if filters.brand:
                params["brands"] = filters.brand.lower().replace(" ", "-")
            if filters.model:
                params["models"] = filters.model.lower().replace(" ", "-")
            elif filters.query and not filters.brand:
                # Free-text: use query as brand search
                parts = filters.query.strip().split(None, 1)
                params["brands"] = parts[0].lower().replace(" ", "-")
                if len(parts) > 1:
                    params["models"] = parts[1].lower().replace(" ", "-")
            if filters.year_from:
                params["yearFrom"] = filters.year_from
            if filters.year_to:
                params["yearTo"] = filters.year_to
            if filters.price_from:
                params["priceFrom"] = int(filters.price_from)
            if filters.price_to:
                params["priceTo"] = int(filters.price_to)
            if filters.km_max:
                params["kmMax"] = filters.km_max

            try:
                resp = await self._cf_session.get(API_URL, params=params)
                if resp.status_code != 200:
                    logger.warning("Auto.cl API HTTP %s", resp.status_code)
                    break
                data = resp.json()
            except Exception as exc:
                logger.error("Auto.cl error: %s", exc)
                break

            items = data.get("results") or []
            if not items:
                break

            for item in items:
                try:
                    r = self._parse_item(item, filters)
                    if r:
                        results.append(r)
                except Exception:
                    continue

            if not data.get("hasNextPage") or len(results) >= filters.limit:
                break

        logger.info("Auto.cl: %d results", len(results))
        return results[:filters.limit]

    def _parse_item(self, item: dict, filters: SearchFilters) -> Optional[CarListing]:
        brand = item.get("brandName") or None
        model = item.get("modelName") or None
        version = item.get("versionName") or ""

        # Brand/model filter check (normalized: ignores hyphens, spaces, dots)
        if filters.brand and brand:
            if self._norm(filters.brand) not in self._norm(brand):
                return None
        if filters.model and model:
            if self._norm(filters.model) not in self._norm(model):
                return None

        year = item.get("year")
        km   = item.get("kilometers")

        price_obj = item.get("price") or {}
        price = float(price_obj.get("CLP") or 0) or None

        fuel_raw  = (item.get("fuelType") or "").lower().replace(" ", "")
        trans_raw = (item.get("transmission") or "").lower().replace(" ", "")
        fuel_type    = _FUEL_MAP.get(fuel_raw) or item.get("fuelType") or None
        transmission = _TRANS_MAP.get(trans_raw) or item.get("transmission") or None

        region_obj = item.get("region") or {}
        location = region_obj.get("name") or None

        slug = item.get("publicationSlug") or item.get("id") or ""
        url  = f"{BASE_URL}/usados/{slug}" if slug else BASE_URL

        image_url = item.get("mainImage") or None

        title_parts = [p for p in [brand, model, version] if p]
        title = " ".join(title_parts)[:120] or "Auto"

        uid = hashlib.md5(url.encode()).hexdigest()[:10]
        r = CarListing(
            id           = f"acl_{uid}",
            source       = self.source_id,
            title        = title,
            brand        = brand,
            model        = model,
            year         = year,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = item.get("condition") or "used",
            fuel_type    = fuel_type,
            transmission = transmission,
            location     = location,
            image_url    = image_url,
            url          = url,
        )
        return r if self.passes_filters(r, filters) else None
