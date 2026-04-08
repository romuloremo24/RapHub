"""AutoCosmos Chile scraper – search page + embedded JSON."""
from __future__ import annotations
import hashlib, json, logging, re
from typing import List, Optional
from bs4 import BeautifulSoup
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://www.autocosmos.cl"
SEARCH_URL = "https://www.autocosmos.cl/auto/usado"
NEW_URL    = "https://www.autocosmos.cl/auto/nuevo"

MAX_PAGES = 5   # fetch up to 5 pages


class AutoCosmosScraper(BaseScraper):
    source_id   = "autocosmos"
    source_name = "AutoCosmos"

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        # AutoCosmos uses brand/model in the URL path for precise filtering:
        # /auto/usado/{brand}/{model}
        base = NEW_URL if filters.condition == "new" else SEARCH_URL
        path_parts = []
        if filters.brand:
            path_parts.append(filters.brand.lower().replace(" ", "-"))
        if filters.model:
            path_parts.append(filters.model.lower().replace(" ", "-"))
        url = base + ("/" + "/".join(path_parts) if path_parts else "")

        # Build filter params (fixed across pages)
        filter_params: dict = {}
        if filters.query and not path_parts:
            filter_params["q"] = filters.query
        if filters.year_from:   filter_params["anoDesde"]    = filters.year_from
        if filters.year_to:     filter_params["anoHasta"]    = filters.year_to
        if filters.price_from:  filter_params["precioDesde"] = int(filters.price_from)
        if filters.price_to:    filter_params["precioHasta"] = int(filters.price_to)
        if filters.km_max:      filter_params["kmHasta"]     = filters.km_max

        all_results: List[CarListing] = []
        seen_ids: set = set()

        for page in range(1, MAX_PAGES + 1):
            params = {**filter_params, "pagina": page}

            try:
                resp = await self.client.get(url, params=params)
                if resp.status_code != 200:
                    logger.warning("AutoCosmos HTTP %s page %d", resp.status_code, page)
                    break
                html = resp.text
            except Exception as exc:
                logger.error("AutoCosmos error: %s", exc)
                break

            page_results = self._parse(html, filters)
            if not page_results:
                break

            new_found = 0
            for r in page_results:
                if r.id not in seen_ids:
                    seen_ids.add(r.id)
                    all_results.append(r)
                    new_found += 1

            if new_found == 0:
                break  # same page returned – no more pages
            logger.info("AutoCosmos page %d: +%d results (total %d)", page, new_found, len(all_results))

        return all_results

    # ── Parsing ──────────────────────────────────────────────────────────────

    def _parse(self, html: str, filters: SearchFilters) -> List[CarListing]:
        results: List[CarListing] = []

        # 1. Try embedded page JSON (Next.js / Nuxt / custom)
        page_json = self.extract_page_json(html)
        if page_json:
            items = self._dig_items(page_json)
            for item in items:
                try:
                    r = self._parse_api_item(item)
                    if self.passes_filters(r, filters):
                        results.append(r)
                except Exception:
                    continue
            if results:
                return results

        # 2. JSON-LD
        soup = BeautifulSoup(html, "lxml")
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") in ("Car", "Vehicle"):
                        r = self._parse_jsonld(item)
                        if self.passes_filters(r, filters):
                            results.append(r)
            except Exception:
                continue
        if results:
            return results[:filters.limit]

        # 3. HTML cards
        cards = (
            soup.select(".listing-card") or
            soup.select("[class*='listing-item']") or
            soup.select("[class*='car-card']") or
            soup.select("[class*='vehicle-card']") or
            soup.select("article[data-id]") or
            soup.select("li.result-item")
        )
        for card in cards:
            try:
                r = self.parse_generic_card(card, BASE_URL, self.source_id)
                if r and self.passes_filters(r, filters):
                    # Enrich brand/model from URL path and filters
                    r = self._enrich_brand_model(r, filters)
                    results.append(r)
            except Exception:
                continue

        return results

    def _enrich_brand_model(self, r: CarListing, filters: SearchFilters) -> CarListing:
        """Extract brand/model from autocosmos URL path like /auto/usado/toyota/corolla/..."""
        if r.url and "/auto/" in r.url:
            # URL pattern: /auto/{condition}/{brand}/{model}/...
            m = re.search(r"/auto/(?:usado|nuevo)/([^/]+)(?:/([^/]+))?", r.url)
            if m:
                if not r.brand:
                    r.brand = m.group(1).replace("-", " ").title()
                if not r.model and m.group(2):
                    r.model = m.group(2).replace("-", " ").replace("--", " ").title()
        # Fallback: use search filter brand
        if not r.brand and filters.brand:
            r.brand = filters.brand.title()
        return r

    @staticmethod
    def _dig_items(data: dict) -> list:
        """Walk Next.js/Nuxt pageProps looking for a list of car objects."""
        for key in ("listings", "items", "vehicles", "autos", "results", "data"):
            if isinstance(data.get(key), list):
                return data[key]
        props = data.get("props", {}).get("pageProps", {})
        for key in ("listings", "items", "vehicles", "autos", "results"):
            if isinstance(props.get(key), list):
                return props[key]
        return []

    def _parse_api_item(self, item: dict) -> CarListing:
        uid   = str(item.get("id") or item.get("slug") or "")
        brand = self.clean_str(item.get("brand") or item.get("make") or item.get("marca") or "")
        model = self.clean_str(item.get("model") or item.get("modelo") or "")
        year  = item.get("year") or item.get("anio") or item.get("año")
        km    = item.get("km") or item.get("mileage") or item.get("kilometros")

        price_raw = item.get("price") or item.get("precio") or 0
        price = self.parse_price(str(price_raw))

        images = item.get("photos") or item.get("images") or item.get("fotos") or []
        image_url: Optional[str] = None
        if isinstance(images, list) and images:
            first = images[0]
            image_url = (first.get("url") or first.get("src")) if isinstance(first, dict) else str(first)

        url = item.get("url") or item.get("permalink") or ""
        if url and not url.startswith("http"):
            url = BASE_URL + url

        return CarListing(
            id           = f"ac_{uid or hashlib.md5(url.encode()).hexdigest()[:10]}",
            source       = self.source_id,
            title        = self.clean_str(item.get("title") or item.get("titulo") or f"{brand} {model} {year}".strip()) or "",
            brand        = brand or None,
            model        = model or None,
            year         = int(year) if year else None,
            km           = int(km) if km else None,
            price        = price,
            currency     = "CLP",
            condition    = item.get("condition") or ("new" if item.get("isNew") else "used"),
            transmission = self.clean_str(item.get("transmission") or item.get("transmision")),
            fuel_type    = self.clean_str(item.get("fuelType") or item.get("combustible")),
            location     = self.clean_str(item.get("location") or item.get("ciudad") or item.get("region")),
            image_url    = image_url,
            url          = url,
        )

    def _parse_jsonld(self, item: dict) -> CarListing:
        uid   = hashlib.md5(str(item.get("url", str(item))).encode()).hexdigest()[:10]
        offer = item.get("offers") or {}
        return CarListing(
            id        = f"ac_{uid}",
            source    = self.source_id,
            title     = self.clean_str(item.get("name") or "") or "",
            brand     = self.clean_str((item.get("brand") or {}).get("name") if isinstance(item.get("brand"), dict) else item.get("brand")),
            model     = self.clean_str(item.get("model")),
            year      = item.get("vehicleModelDate") or item.get("year"),
            km        = self.parse_km(str((item.get("mileageFromOdometer") or {}).get("value", ""))),
            price     = self.parse_price(str(offer.get("price") or item.get("price") or "")),
            currency  = offer.get("priceCurrency", "CLP"),
            condition = "new" if "NewCondition" in str(item.get("itemCondition", "")) else "used",
            fuel_type = self.clean_str(item.get("fuelType")),
            color     = self.clean_str(item.get("color")),
            image_url = (item.get("image") or [None])[0] if isinstance(item.get("image"), list) else item.get("image"),
            url       = item.get("url") or "",
        )
