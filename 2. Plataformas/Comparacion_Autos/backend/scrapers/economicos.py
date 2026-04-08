"""Económicos.cl (El Mercurio) scraper – HTML card scraping."""
from __future__ import annotations
import hashlib, logging, re
from typing import List, Optional
from bs4 import BeautifulSoup
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://www.economicos.cl"
SEARCH_URL = "https://www.economicos.cl/autos-camionetas/"

MAX_PAGES = 3   # 43 cards/page → up to ~129 results


class EconomicosScraper(BaseScraper):
    source_id   = "economicos"
    source_name = "Económicos"

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        # Build search params – ?q= filters by brand/model effectively
        parts = [p for p in [filters.brand, filters.model, filters.query] if p]
        base_params: dict = {}
        if parts:
            base_params["q"] = " ".join(parts)
        if filters.year_from:  base_params["agno_desde"] = filters.year_from
        if filters.year_to:    base_params["agno_hasta"] = filters.year_to
        if filters.price_from: base_params["precio_min"] = int(filters.price_from)
        if filters.price_to:   base_params["precio_max"] = int(filters.price_to)

        results: List[CarListing] = []
        seen_ids: set = set()

        for page in range(1, MAX_PAGES + 1):
            params = {**base_params}
            if page > 1:
                params["pag"] = page

            try:
                resp = await self.client.get(SEARCH_URL, params=params)
                if resp.status_code != 200:
                    logger.warning("Económicos HTTP %s page %d", resp.status_code, page)
                    break
                html = resp.text
            except Exception as exc:
                logger.error("Económicos error: %s", exc)
                break

            page_results = self._parse_html(html, filters)
            if not page_results:
                break

            new_found = 0
            for r in page_results:
                if r.id not in seen_ids:
                    seen_ids.add(r.id)
                    results.append(r)
                    new_found += 1

            if new_found == 0:
                break
            logger.info("Económicos page %d: +%d results (total %d)", page, new_found, len(results))

        return results

    def _parse_html(self, html: str, filters: SearchFilters) -> List[CarListing]:
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select("div.result.row-fluid")
        results: List[CarListing] = []

        for card in cards:
            try:
                r = self._parse_card(card)
                if r and self.passes_filters(r, filters):
                    if filters.brand and r.brand:
                        if self._norm(filters.brand) not in self._norm(r.brand):
                            continue
                    results.append(r)
            except Exception:
                continue

        return results

    def _parse_card(self, card) -> Optional[CarListing]:
        # Title: "Nissan March 1.6 ACTIVE MT 5P - 2018"
        title_el = card.select_one("h3")
        if not title_el:
            return None
        title = self.clean_str(title_el.get_text())
        if not title:
            return None

        # Extract year from end of title (e.g. "- 2018")
        year: Optional[int] = None
        m = re.search(r"-\s*((?:19|20)\d{2})\s*$", title)
        if m:
            year = int(m.group(1))
            # Clean title to remove year suffix
            title = title[:m.start()].strip()

        # Link
        link_el = card.select_one("a[href]")
        url = ""
        if link_el:
            href = link_el.get("href", "")
            url = (BASE_URL + href) if href.startswith("/") else href

        # Price from li.ecn_precio
        price_el = card.select_one("li.ecn_precio")
        price = self.parse_price(price_el.get_text() if price_el else "")

        # Location: second meta li (first is price)
        meta_items = card.select(".meta li")
        location: Optional[str] = None
        if len(meta_items) >= 2:
            loc_text = self.clean_str(meta_items[1].get_text())
            if loc_text:
                # Format: "Metropolitana | Santiago"
                location = loc_text.split("|")[0].strip() or loc_text

        # Image — URLs contain literal {width} placeholder; replace with real size
        img_el = card.select_one("[data-src]")
        image_url: Optional[str] = None
        if img_el:
            src = img_el.get("data-src", "").replace("{width}", "400")
            if src.startswith("//"):
                src = "https:" + src
            if src and "data:image" not in src and "no_image" not in src:
                image_url = src

        # KM from card text
        full_card = card.get_text(" ", strip=True)
        km_m = re.search(r"([\d][.\d]*\d?)\s*km", full_card, re.IGNORECASE)
        km = self.parse_km(km_m.group(1)) if km_m else None

        # Transmission and fuel
        full_lower = full_card.lower()
        transmission: Optional[str] = None
        fuel_type: Optional[str] = None
        if "automát" in full_lower:
            transmission = "Automático"
        elif "manual" in full_lower:
            transmission = "Manual"
        if "diésel" in full_lower or "diesel" in full_lower:
            fuel_type = "Diésel"
        elif "nafta" in full_lower or "bencina" in full_lower:
            fuel_type = "Bencina"
        elif "eléctrico" in full_lower:
            fuel_type = "Eléctrico"
        elif "híbrido" in full_lower:
            fuel_type = "Híbrido"

        # Brand/model from title (title is already stripped of year)
        parts = title.split()
        brand = parts[0] if parts else None
        model = " ".join(parts[1:]) if len(parts) > 1 else None

        uid = hashlib.md5((url or title).encode()).hexdigest()[:10]
        return CarListing(
            id           = f"ec_{uid}",
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
            location     = location,
            image_url    = image_url,
            url          = url,
        )
