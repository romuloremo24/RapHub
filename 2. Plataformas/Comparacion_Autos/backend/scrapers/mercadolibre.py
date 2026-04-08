"""MercadoLibre Chile scraper – HTML scraping with Googlebot UA."""
from __future__ import annotations
import hashlib, logging, re
from typing import List, Optional
from bs4 import BeautifulSoup
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://autos.mercadolibre.cl"
# Used-car search path; new cars use /autos-nuevos/
USED_PATH  = "/autos-usados"
ALL_PATH   = "/autos-camionetas"

# Googlebot UA bypasses the 403 on their listing pages
BOT_UA = (
    "Mozilla/5.0 (compatible; Googlebot/2.1; "
    "+http://www.google.com/bot.html)"
)

PAGE_SIZE = 48   # ML returns 48 items per page
MAX_PAGES = 10   # fetch up to 10 pages → up to 480 results


class MercadoLibreScraper(BaseScraper):
    source_id   = "mercadolibre"
    source_name = "MercadoLibre"

    def __init__(self):
        import httpx
        # Use Googlebot UA – regular UA gets a 2KB JS shell, Googlebot gets full HTML
        self.client = httpx.AsyncClient(
            headers={
                "User-Agent": BOT_UA,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "es-CL,es;q=0.9",
            },
            timeout=20.0,
            follow_redirects=True,
        )

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        # Choose path based on condition
        if filters.condition == "used":
            path = USED_PATH
        elif filters.condition == "new":
            path = "/autos-nuevos"
        else:
            path = ALL_PATH

        # Append brand/model as URL segments
        if filters.brand:
            path += "/" + filters.brand.lower().replace(" ", "-")
            if filters.model:
                path += "-" + filters.model.lower().replace(" ", "-")

        base_path = BASE_URL + path + "/"
        results: List[CarListing] = []
        seen_ids: set = set()

        for page in range(1, (filters.max_pages or MAX_PAGES) + 1):
            # ML pagination: page 1 has no suffix, page N uses _Desde_{(N-1)*48+1}
            if page == 1:
                url = base_path
            else:
                offset = (page - 1) * PAGE_SIZE + 1
                url = base_path + f"_Desde_{offset}/"

            try:
                html = await self._get_html(url)
            except Exception as exc:
                logger.error("MercadoLibre error: %s", exc)
                break

            page_results = self._parse(html, filters)
            if not page_results:
                break  # no more results

            new_found = 0
            for r in page_results:
                if r.id not in seen_ids:
                    seen_ids.add(r.id)
                    results.append(r)
                    new_found += 1

            if new_found == 0:
                break  # all duplicates – we've looped
            logger.info("MercadoLibre page %d: +%d results (total %d)", page, new_found, len(results))

        return results

    def _parse(self, html: str, filters: SearchFilters) -> List[CarListing]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.select("li.ui-search-layout__item")
        results: List[CarListing] = []

        for item in items:
            try:
                r = self._parse_item(item)
                if r and self.passes_filters(r, filters):
                    results.append(r)
            except Exception:
                continue

        return results

    def _parse_item(self, item) -> Optional[CarListing]:
        # Title & link
        title_el = item.select_one(".poly-component__title")
        if not title_el:
            return None
        title = self.clean_str(title_el.get_text())
        if not title:
            return None

        link = title_el.get("href", "") or ""
        # Strip tracking params
        if "#" in link:
            link = link[:link.index("#")]

        # Price – use aria-label for exact number, e.g. "6990000 pesos chilenos"
        price: Optional[float] = None
        price_el = item.select_one("[aria-label*='pesos chilenos'], [aria-label*='peso chileno']")
        if price_el:
            m = re.search(r"(\d[\d\s]*)", price_el.get("aria-label", ""))
            if m:
                try:
                    price = float(m.group(1).replace(" ", ""))
                except ValueError:
                    pass
        if price is None:
            # fallback: fraction element
            frac = item.select_one(".andes-money-amount__fraction")
            if frac:
                price = self.parse_price(frac.get_text())

        # Year, km, fuel, transmission from attributes list
        year: Optional[int] = None
        km:   Optional[int] = None
        fuel_type: Optional[str] = None
        transmission: Optional[str] = None
        _FUELS = {"nafta", "bencina", "diesel", "diésel", "eléctrico", "electrico",
                  "híbrido", "hibrido", "gnc", "gas natural"}
        _TRANS = {"manual", "automático", "automatico", "automática", "automatica",
                  "cvt", "tiptronic", "dsg"}
        for attr in item.select(".poly-attributes_list__item"):
            txt = attr.get_text(strip=True)
            low = txt.lower()
            if re.match(r"^(19[6-9]\d|20[0-2]\d)$", txt):
                year = int(txt)
            elif re.search(r"\bkm\b", txt, re.IGNORECASE):
                km = self.parse_km(txt)
            elif low in _FUELS:
                fuel_type = txt
            elif low in _TRANS:
                transmission = txt

        # Location
        loc_el = item.select_one(".poly-component__location")
        location = self.clean_str(loc_el.get_text() if loc_el else "")

        # Image
        img_el = item.select_one("img.poly-component__picture, img[data-testid='picture']")
        image_url: Optional[str] = None
        if img_el:
            src = img_el.get("src", "")
            if src and "data:image" not in src:
                image_url = src

        # Only include listings that look like actual vehicles (must have a year)
        if year is None:
            return None

        # Condition
        condition = "used"
        full_text = item.get_text(" ").lower()
        if "nuevo" in full_text or "0 km" in full_text:
            condition = "new"

        # Extract brand from title (first word usually)
        brand, model = self._extract_brand_model(title)

        uid = hashlib.md5((link or title).encode()).hexdigest()[:10]
        return CarListing(
            id           = f"ml_{uid}",
            source       = self.source_id,
            title        = title,
            brand        = brand,
            model        = model,
            year         = year,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = condition,
            fuel_type    = fuel_type,
            transmission = transmission,
            location     = location or None,
            image_url    = image_url,
            url          = link or BASE_URL,
        )

    BRANDS = [
        "Toyota", "Hyundai", "Kia", "Nissan", "Chevrolet", "Volkswagen",
        "Mazda", "Honda", "Mitsubishi", "Suzuki", "Subaru", "Ford",
        "Renault", "Peugeot", "Citroën", "Citroen", "Fiat", "Chery",
        "BMW", "Audi", "Mercedes", "Volvo", "Jeep", "Dodge", "Chrysler",
        "Alfa Romeo", "Seat", "Skoda", "Opel", "Land Rover", "Lexus",
        "Infiniti", "Geely", "BYD", "DFSK", "JAC", "Haval", "MG",
        "Great Wall", "Changan", "Ssangyong", "Lifan", "Zotye", "Changan",
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
        # If no known brand, use first word
        parts = title.split()
        return (parts[0] if parts else None), (parts[1] if len(parts) > 1 else None)
