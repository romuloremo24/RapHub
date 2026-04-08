"""Yapo.cl scraper – AJAX endpoint with q=f_make.Brand filter."""
from __future__ import annotations
import hashlib
import logging
import re
from typing import List, Optional
from bs4 import BeautifulSoup
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL  = "https://www.yapo.cl"
AJAX_URL  = "https://www.yapo.cl/chile-es/ajax/autos-usados"
MAX_PAGES = 10


class YapoScraper(BaseScraper):
    source_id   = "yapo"
    source_name = "Yapo.cl"

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        # Build the q parameter using Yapo's internal filter format
        q_parts = []
        if filters.brand:
            q_parts.append(f"f_make.{filters.brand.capitalize()}")
        if filters.model:
            q_parts.append(f"f_model.{filters.model}")
        if not q_parts and filters.query:
            q_parts.append(filters.query)

        base_params: dict = {"list": "category"}
        if q_parts:
            base_params["q"] = " ".join(q_parts)
        if filters.price_from:
            base_params["f_price_from"] = int(filters.price_from)
        if filters.price_to:
            base_params["f_price_to"] = int(filters.price_to)
        if filters.km_max:
            base_params["f_mileage_to"] = filters.km_max

        headers = {
            **dict(self.client.headers),
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Referer": BASE_URL + "/autos-usados/",
            "X-Requested-With": "XMLHttpRequest",
        }

        # Prime session cookies – use exact URL without redirect to avoid delay
        try:
            await self.client.get(
                BASE_URL + "/autos-usados",
                headers={**dict(self.client.headers), "Accept": "text/html"},
                follow_redirects=True,
            )
        except Exception:
            pass

        results: List[CarListing] = []
        seen_urls: set = set()

        for page in range(1, (filters.max_pages or MAX_PAGES) + 1):
            params = {**base_params, "page": page}
            try:
                resp = await self.client.get(AJAX_URL, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.warning("Yapo AJAX HTTP %s page %d", resp.status_code, page)
                    break
                data = resp.json()
                listing_html = data.get("listing", "")
            except Exception as exc:
                logger.error("Yapo AJAX error: %s", exc)
                break

            new_found = self._parse_into(listing_html, filters, results, seen_urls)
            logger.info("Yapo page %d: +%d (total %d)", page, new_found, len(results))

            if new_found == 0 or len(results) >= filters.limit:
                break

        return results[:filters.limit]

    def _parse_into(self, html: str, filters: SearchFilters,
                    results: list, seen_urls: set) -> int:
        soup = BeautifulSoup(html, "lxml")
        added = 0

        for tile in soup.select("[class*=d3-ad-tile]"):
            if tile.find_parent(class_=lambda c: c and "d3-ad-tile" in " ".join(c)):
                continue

            link_el = tile.select_one("a[href]:not([href='#'])")
            if not link_el:
                continue

            href = link_el.get("href", "")
            url  = (BASE_URL + href) if href.startswith("/") else href
            if url in seen_urls:
                continue
            seen_urls.add(url)

            try:
                result = self._parse_tile(tile, url)
                if result and self.passes_filters(result, filters):
                    results.append(result)
                    added += 1
            except Exception as exc:
                logger.debug("Yapo tile parse error: %s", exc)

            if len(results) >= filters.limit:
                break

        return added

    def _parse_tile(self, tile, url: str) -> Optional[CarListing]:
        title_el = tile.select_one(
            "[class*=d3-ad-tile__title], [class*=title], h2, h3, [class*=name]"
        )
        title = self.clean_str(title_el.get_text() if title_el else "")
        if not title:
            return None

        price_el = tile.select_one("[class*=price], [class*=Price]")
        price_text = price_el.get_text(strip=True) if price_el else ""
        price_text = re.sub(r"-\d+%.*", "", price_text)
        price = self.parse_price(price_text)

        full_text = tile.get_text(" ", strip=True)
        year = self.parse_year(full_text)
        km_m = re.search(r"([\d][.\d]*)\s*km", full_text, re.IGNORECASE)
        km   = self.parse_km(km_m.group(1)) if km_m else None

        image_url: Optional[str] = None
        img_el = tile.select_one("img")
        if img_el:
            for attr in ("data-src", "data-lazy", "data-original", "src"):
                v = img_el.get(attr, "")
                if v and "data:image" not in v and "placeholder" not in v.lower():
                    image_url = ("https:" + v) if v.startswith("//") else v
                    break

        brand, model = self._extract_brand_model(title)
        uid = hashlib.md5(url.encode()).hexdigest()[:12]

        # Location
        loc_el = tile.select_one(
            "[class*=location], [class*=localisation], [class*=region], [class*=lugar]"
        )
        location = self.clean_str(loc_el.get_text() if loc_el else "")
        if not location:
            _REGIONS = ["Metropolitana", "Valparaíso", "Biobío", "Araucanía", "Maule",
                        "Los Lagos", "Antofagasta", "Coquimbo", "Tarapacá", "Atacama",
                        "Los Ríos", "Aysén", "Magallanes", "Ñuble", "Arica"]
            for reg in _REGIONS:
                if reg in full_text:
                    location = reg
                    break

        # Condition
        full_lower = full_text.lower()
        condition = "new" if ("nuevo" in full_lower or "0 km" in full_lower) else "used"

        # Transmission / fuel from text
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

        return CarListing(
            id           = f"yp_{uid}",
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
            location     = location or None,
            image_url    = image_url,
            url          = url,
        )

    BRANDS = [
        "Toyota", "Hyundai", "Kia", "Nissan", "Chevrolet", "Volkswagen",
        "Mazda", "Honda", "Mitsubishi", "Suzuki", "Subaru", "Ford",
        "Renault", "Peugeot", "Citroën", "Citroen", "Fiat", "Chery",
        "BMW", "Audi", "Mercedes", "Volvo", "Jeep", "Dodge", "Chrysler",
        "Alfa Romeo", "Seat", "Skoda", "Opel", "Land Rover", "Lexus",
        "Infiniti", "Geely", "BYD", "DFSK", "JAC", "Haval", "MG",
        "Great Wall", "Changan", "Ssangyong", "Lifan",
    ]

    def _extract_brand_model(self, title: str):
        title_lower = title.lower()
        for brand in self.BRANDS:
            if brand.lower() in title_lower:
                pattern = re.compile(
                    r"\b" + re.escape(brand) + r"\s+([A-Za-z0-9\-]+)", re.IGNORECASE
                )
                m = pattern.search(title)
                model = m.group(1) if m else None
                return brand, model
        return None, None
