"""AutosUsados.cl scraper – NEXT_DATA embedded JSON."""
from __future__ import annotations
import hashlib, json, logging, re
from typing import List, Optional
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://autosusados.cl"
SEARCH_URL = "https://autosusados.cl/vehiculos"

PAGE_SIZE = 20   # items per page
MAX_PAGES = 5    # fetch up to 5 pages → up to 100 results

REGION_MAP = {
    1: "Tarapacá", 2: "Antofagasta", 3: "Atacama", 4: "Coquimbo",
    5: "Valparaíso", 6: "O'Higgins", 7: "Maule", 8: "Biobío",
    9: "Araucanía", 10: "Los Lagos", 11: "Aysén", 12: "Magallanes",
    13: "Metropolitana", 14: "Los Ríos", 15: "Arica y Parinacota", 16: "Ñuble",
}


class AutosUsadosScraper(BaseScraper):
    source_id   = "autosusados"
    source_name = "AutosUsados"

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        # Build query params: /vehiculos?v=1&brand=nissan&model=x-trail
        base_params: dict = {"v": 1}
        if filters.brand:
            base_params["brand"] = filters.brand.lower()
            if filters.model:
                base_params["model"] = filters.model.lower().replace(" ", "-")
        elif filters.query:
            # Free-text: split into brand (first word) and model (rest)
            parts = filters.query.strip().split(None, 1)
            base_params["brand"] = parts[0].lower()
            if len(parts) > 1:
                base_params["model"] = parts[1].lower().replace(" ", "-")

        results: List[CarListing] = []
        total_pages = MAX_PAGES  # will be updated from first page's total field

        for page in range(1, MAX_PAGES + 1):
            if page > total_pages:
                break

            params = {**base_params}
            if page > 1:
                params["page"] = page

            try:
                resp = await self.client.get(SEARCH_URL, params=params)
                if resp.status_code != 200:
                    logger.warning("AutosUsados HTTP %s page %d", resp.status_code, page)
                    break
                html = resp.text
            except Exception as exc:
                logger.error("AutosUsados error: %s", exc)
                break

            # Extract NEXT_DATA
            m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.+?)</script>', html, re.DOTALL)
            if not m:
                logger.warning("AutosUsados: no NEXT_DATA found on page %d", page)
                break

            try:
                data = json.loads(m.group(1))
                page_props = data.get("props", {}).get("pageProps", {})
                posts = page_props.get("initialPosts", [])
                # Use total to calculate real number of pages
                if page == 1:
                    total = page_props.get("total", 0)
                    if total:
                        total_pages = min(MAX_PAGES, -(-total // PAGE_SIZE))  # ceiling div
                        logger.info("AutosUsados total: %d → %d pages", total, total_pages)
            except Exception as exc:
                logger.error("AutosUsados JSON parse error: %s", exc)
                break

            if not posts:
                break

            for item in posts:
                try:
                    r = self._parse_item(item, filters)
                    if r and self.passes_filters(r, filters):
                        results.append(r)
                except Exception:
                    continue

            logger.info("AutosUsados page %d: +%d results (total %d)", page, len(posts), len(results))

        return results

    def _parse_item(self, item: dict, filters: SearchFilters) -> Optional[CarListing]:
        car_id = item.get("carID", "")
        brand  = self.clean_str(item.get("brandName", ""))
        model  = self.clean_str(item.get("modelName", ""))
        desc   = self.clean_str(item.get("description", ""))
        year   = item.get("year")
        price_raw = item.get("price", "")

        try:
            price = float(str(price_raw).replace(",", ""))
        except (ValueError, TypeError):
            price = None

        km_raw = item.get("kilometers", "")
        try:
            km = int(str(km_raw).replace(".", "").replace(",", ""))
        except (ValueError, TypeError):
            km = None

        region_id = item.get("region")
        location  = REGION_MAP.get(region_id, str(region_id)) if region_id else None

        image_url = item.get("photo") or None
        color = self.clean_str(item.get("color") or item.get("colorName"))

        # Build a linkable URL using brand + model slug + carID
        b_slug = (brand or "auto").lower().replace(" ", "-")
        m_slug = model.lower().replace(" ", "-") if model else ""
        slug   = f"{b_slug}-{m_slug}" if m_slug else b_slug
        url    = f"{BASE_URL}/autos/{slug}/{car_id}" if car_id else f"{BASE_URL}/autos/{slug}"

        title = desc or f"{brand} {model} {year}".strip()

        return CarListing(
            id           = f"au_{car_id or hashlib.md5(title.encode()).hexdigest()[:10]}",
            source       = self.source_id,
            title        = title,
            brand        = brand or None,
            model        = model or None,
            year         = int(year) if year else None,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = "used",
            fuel_type    = self.clean_str(item.get("fuelName")),
            transmission = self.clean_str(item.get("transmissionName")),
            color        = color,
            location     = location,
            image_url    = image_url,
            url          = url,
        )
