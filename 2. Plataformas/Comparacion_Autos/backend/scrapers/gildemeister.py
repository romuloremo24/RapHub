"""GildemeisterUsados.cl scraper – WordPress REST API."""
from __future__ import annotations
import hashlib, logging, re
from typing import List, Optional
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL  = "https://gildemeisterusados.cl"
WP_BASE   = "https://gildemeisterusados.cl/wp-json/wp/v2"

PAGE_SIZE = 100
MAX_PAGES = 5


class GildemeisterScraper(BaseScraper):
    source_id   = "gildemeister"
    source_name = "Gildemeister Usados"

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        params: dict = {
            "per_page": PAGE_SIZE,
            "_embed":   1,
        }

        # Resolve brand term ID
        if filters.brand:
            brand_id = await self._get_brand_id(filters.brand)
            if brand_id:
                params["car_brand"] = brand_id
            else:
                # No matching brand – return empty instead of all cars
                return []

        all_results: List[CarListing] = []
        seen_ids: set = set()

        for page in range(1, MAX_PAGES + 1):
            params["page"] = page
            try:
                resp = await self.client.get(f"{WP_BASE}/used_car", params=params)
                if resp.status_code == 400:
                    break  # page out of range
                if resp.status_code != 200:
                    logger.warning("Gildemeister HTTP %s page %d", resp.status_code, page)
                    break
                items = resp.json()
                if not items:
                    break
            except Exception as exc:
                logger.error("Gildemeister error: %s", exc)
                break

            new_found = 0
            for item in items:
                try:
                    r = self._parse_item(item)
                    if r and r.id not in seen_ids and self.passes_filters(r, filters):
                        seen_ids.add(r.id)
                        all_results.append(r)
                        new_found += 1
                except Exception:
                    continue

            if new_found == 0:
                break
            logger.info("Gildemeister page %d: +%d results (total %d)", page, new_found, len(all_results))

            total = int(resp.headers.get("X-WP-Total", 0))
            if len(all_results) >= total:
                break

        return all_results

    async def _get_brand_id(self, brand: str) -> Optional[int]:
        try:
            resp = await self.client.get(
                f"{WP_BASE}/car_brand",
                params={"search": brand, "per_page": 5},
            )
            if resp.status_code != 200:
                return None
            terms = resp.json()
            if not terms:
                return None
            brand_lower = brand.lower()
            for term in terms:
                if brand_lower in term.get("name", "").lower():
                    return term["id"]
            return terms[0]["id"]
        except Exception:
            return None

    def _parse_item(self, item: dict) -> Optional[CarListing]:
        uid  = str(item.get("id", ""))
        link = item.get("link", "")
        title_rendered = (item.get("title") or {}).get("rendered", "")
        title = self.clean_str(title_rendered) or ""

        # Extract brand/model/year/transmission/fuel/km/price from embedded taxonomy terms
        brand: Optional[str] = None
        model: Optional[str] = None
        year:  Optional[int] = None
        km:    Optional[int] = None
        price: Optional[float] = None
        color: Optional[str] = None
        transmission: Optional[str] = None
        fuel_type:    Optional[str] = None
        location:     Optional[str] = None

        for term_group in (item.get("_embedded") or {}).get("wp:term", []):
            for term in term_group:
                taxonomy = term.get("taxonomy", "")
                name     = term.get("name", "")
                if taxonomy == "car_brand":
                    brand = name.title()
                elif taxonomy == "car_model":
                    model = name.title()
                elif taxonomy == "car_year":
                    try:
                        year = int(name)
                    except ValueError:
                        pass
                elif taxonomy == "car_transmission":
                    transmission = name
                elif taxonomy == "car_fuel":
                    fuel_type = name
                elif taxonomy == "boffice_region":
                    location = name.title()
                elif taxonomy == "car_km":
                    km = self.parse_km(name)
                elif taxonomy == "car_price":
                    price = self.parse_price(name)
                elif taxonomy == "car_color":
                    color = name.title()

        # ACF custom fields (if ACF to REST API plugin is active)
        acf = item.get("acf") or {}
        if isinstance(acf, dict):
            for key in ("precio", "price", "valor", "monto", "precio_venta"):
                if acf.get(key):
                    try:
                        price = float(str(acf[key]).replace(".", "").replace(",", "."))
                    except (ValueError, TypeError):
                        price = self.parse_price(str(acf[key]))
                    if price:
                        break
            for key in ("km", "kilometraje", "kilometros", "odometro", "odómetro"):
                if acf.get(key) and not km:
                    km = self.parse_km(str(acf[key]))
            if not color:
                color = self.clean_str(acf.get("color") or acf.get("colour") or "")

        # Try excerpt for price/km if still missing
        excerpt = (item.get("excerpt") or {}).get("rendered", "")
        if price is None and excerpt:
            pm = re.search(r"(?:\$|CLP)\s*([\d.,]+)", excerpt, re.IGNORECASE)
            if pm:
                price = self.parse_price(pm.group(0))
        if km is None and excerpt:
            km_m = re.search(r"([\d.]+)\s*km", excerpt, re.IGNORECASE)
            if km_m:
                km = self.parse_km(km_m.group(1))

        # If model wasn't in terms, try extracting from title (first word = model)
        if not model and title:
            parts = title.split()
            if parts:
                model = parts[0].title()

        if not title and brand:
            title = f"{brand} {model or ''} {year or ''}".strip()

        if not title:
            return None

        # Image from featured media
        image_url: Optional[str] = None
        for media_list in (item.get("_embedded") or {}).get("wp:featuredmedia", []):
            if isinstance(media_list, dict):
                image_url = (
                    media_list.get("source_url") or
                    (media_list.get("media_details") or {})
                    .get("sizes", {}).get("medium", {}).get("source_url")
                )
                if image_url:
                    break

        return CarListing(
            id           = f"gm_{uid or hashlib.md5(link.encode()).hexdigest()[:10]}",
            source       = self.source_id,
            title        = title,
            brand        = brand,
            model        = model,
            year         = year,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = "used",
            transmission = transmission,
            fuel_type    = fuel_type,
            color        = color or None,
            location     = location,
            image_url    = image_url,
            url          = link,
        )
