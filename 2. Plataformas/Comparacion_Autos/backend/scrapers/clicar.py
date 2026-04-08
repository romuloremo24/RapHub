"""Clicar.cl scraper – Next.js SSR paginated article cards."""
from __future__ import annotations
import hashlib, logging, math, re, urllib.parse
from typing import List, Optional
from bs4 import BeautifulSoup
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://www.clicar.cl"
SEARCH_URL = "https://www.clicar.cl/vehiculos/usado"


class ClicarScraper(BaseScraper):
    source_id   = "clicar"
    source_name = "Clicar"

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        results: List[CarListing] = []
        pages_needed = filters.max_pages or (math.ceil(filters.limit / 12) + 1)

        for page in range(1, pages_needed + 1):
            url = SEARCH_URL
            params: list[str] = []
            if filters.brand:
                params.append(f"marca={filters.brand.lower().replace(' ', '-')}")
            if page > 1:
                params.append(f"page={page}")
            if params:
                url += "?" + "&".join(params)

            try:
                resp = await self.client.get(url)
                if resp.status_code != 200:
                    logger.warning("Clicar HTTP %s for %s", resp.status_code, url)
                    break
                html = resp.text
            except Exception as exc:
                logger.error("Clicar error: %s", exc)
                break

            soup = BeautifulSoup(html, "lxml")
            articles = soup.select("article")
            if not articles:
                break

            for art in articles:
                try:
                    r = self._parse_article(art)
                    if not r:
                        continue
                    if filters.model and r.model:
                        if self._norm(filters.model) not in self._norm(r.model):
                            continue
                    if self.passes_filters(r, filters):
                        results.append(r)
                except Exception as exc:
                    logger.debug("Clicar parse error: %s", exc)

            if len(results) >= filters.limit:
                break

        logger.info("Clicar: %d results", len(results))
        return results[:filters.limit]

    def _parse_article(self, art) -> Optional[CarListing]:
        a_el = art.find("a", href=True)
        if not a_el:
            return None

        href = a_el["href"]
        url = (BASE_URL + href) if href.startswith("/") else href

        # Structured spans: brand, model, details "2023 | 71.105 Km | Mecanica | Diesel"
        spans = [s.get_text(strip=True) for s in art.select("span") if s.get_text(strip=True)]

        brand: Optional[str] = None
        model: Optional[str] = None
        year: Optional[int] = None
        km: Optional[int] = None
        transmission: Optional[str] = None
        fuel_type: Optional[str] = None
        price: Optional[float] = None

        # Brand from URL /marcas/{brand}/usado/
        brand_m = re.match(r"/marcas/([\w-]+)/usado/", href)
        if brand_m:
            brand = brand_m.group(1).replace("-", " ").title()

        # Find the detail span: "YYYY | XX.XXX Km | Trans | Fuel"
        for span in spans:
            if re.search(r"\d{4}\s*\|\s*[\d.]+\s*Km", span, re.IGNORECASE):
                parts = [p.strip() for p in span.split("|")]
                if len(parts) >= 1 and re.match(r"^\d{4}$", parts[0]):
                    year = int(parts[0])
                if len(parts) >= 2:
                    km_m = re.search(r"([\d.]+)", parts[1])
                    if km_m:
                        km = int(km_m.group(1).replace(".", ""))
                if len(parts) >= 3:
                    trans_raw = parts[2].lower()
                    if "autom" in trans_raw or "cvt" in trans_raw or "at" in trans_raw:
                        transmission = "Automático"
                    elif "mec" in trans_raw or "manual" in trans_raw or "mt" in trans_raw:
                        transmission = "Manual"
                    else:
                        transmission = parts[2].strip() or None
                if len(parts) >= 4:
                    fuel_raw = parts[3].lower()
                    if "diesel" in fuel_raw or "diés" in fuel_raw:
                        fuel_type = "Diésel"
                    elif "gasolin" in fuel_raw or "bencin" in fuel_raw or "nafta" in fuel_raw:
                        fuel_type = "Gasolina"
                    elif "eléctr" in fuel_raw or "electr" in fuel_raw:
                        fuel_type = "Eléctrico"
                    elif "híbrid" in fuel_raw or "hibrid" in fuel_raw:
                        fuel_type = "Híbrido"
                    else:
                        fuel_type = parts[3].strip() or None
                break

        # Price: find adjacent "$" + number spans
        for i, span in enumerate(spans):
            if span == "$" and i + 1 < len(spans):
                price = self.parse_price(spans[i + 1])
                break
        if price is None:
            price_m = re.search(r"\$\s*([\d.,]+)", art.get_text(" ", strip=True))
            if price_m:
                price = self.parse_price(price_m.group(0))

        # Model: from URL slug or dedicated span
        if not model and brand:
            slug_m = re.match(r"/marcas/[\w-]+/usado/([\w-]+)", href)
            if slug_m:
                slug = slug_m.group(1)
                slug = re.sub(r"-\d+$", "", slug)
                slug_title = slug.replace("-", " ").title()
                if brand and slug_title.lower().startswith(brand.lower()):
                    model = slug_title[len(brand):].strip() or None
                else:
                    model = slug_title

        # Try to find brand+model from dedicated spans (after badge span)
        for i, span in enumerate(spans):
            if brand and span == brand:
                if i + 1 < len(spans):
                    model = spans[i + 1] or None
                break

        title_parts = [p for p in [brand, model] if p]
        title = " ".join(title_parts) or "Auto"

        # Image from _next/image wrapper
        image_url: Optional[str] = None
        for img in art.select("img[src]"):
            src = img.get("src", "")
            if "ctfassets" in src:
                continue
            m = re.search(r"url=([^&]+)", src)
            if m:
                image_url = urllib.parse.unquote(m.group(1))
                break
            if src and not src.startswith("data:") and not src.startswith("//images"):
                image_url = src if src.startswith("http") else BASE_URL + src
                break

        uid = hashlib.md5(url.encode()).hexdigest()[:10]

        return CarListing(
            id           = f"cl_{uid}",
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
            image_url    = image_url,
            url          = url,
        )
