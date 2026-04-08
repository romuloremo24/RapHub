"""Kavak Chile scraper – HTML scraping with Googlebot UA."""
from __future__ import annotations
import hashlib, logging, re
from typing import List, Optional
from bs4 import BeautifulSoup
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL   = "https://www.kavak.com"
SEARCH_URL = "https://www.kavak.com/cl/usados"

# Googlebot UA bypasses the Ionic SPA shell
BOT_UA = (
    "Mozilla/5.0 (compatible; Googlebot/2.1; "
    "+http://www.google.com/bot.html)"
)

MAX_PAGES = 8   # fetch up to 8 pages


class KavakScraper(BaseScraper):
    source_id   = "kavak"
    source_name = "Kavak"

    def __init__(self):
        import httpx
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
        base_url = SEARCH_URL
        if filters.brand:
            base_url += "/" + filters.brand.lower().replace(" ", "-")

        results: List[CarListing] = []
        seen_ids: set = set()

        for page in range(1, (filters.max_pages or MAX_PAGES) + 1):
            # Kavak pagination: page 1 = /usados/{brand}, page N = /usados/{brand}/page/{N}
            url = base_url if page == 1 else f"{base_url}/page/{page}"

            try:
                resp = await self.client.get(url)
                if resp.status_code != 200:
                    logger.warning("Kavak HTML %s page %d", resp.status_code, page)
                    break
            except Exception as exc:
                logger.error("Kavak error: %s", exc)
                break

            page_results = self._parse(resp.text, filters)
            if not page_results:
                break

            new_found = 0
            for r in page_results:
                if r.id not in seen_ids:
                    seen_ids.add(r.id)
                    results.append(r)
                    new_found += 1

            if new_found == 0:
                break  # same page returned (no more pages)
            logger.info("Kavak page %d: +%d results (total %d)", page, new_found, len(results))

        return results

    def _parse(self, html: str, filters: SearchFilters) -> List[CarListing]:
        soup = BeautifulSoup(html, "lxml")

        # Top-level card elements (exclude nested)
        all_cards = soup.select("[class*=cardProduct]")
        cards = [c for c in all_cards
                 if not c.find_parent(attrs={"class": lambda v: v and any("cardProduct" in x for x in v)})]

        results: List[CarListing] = []
        for card in cards:
            try:
                r = self._parse_card(card)
                if r and self.passes_filters(r, filters):
                    if filters.model and r.model:
                        if self._norm(filters.model) not in self._norm(r.model):
                            continue
                    results.append(r)
            except Exception:
                continue

        return results

    def _parse_card(self, card) -> Optional[CarListing]:
        # Link
        url = card.get("href", "") if card.name == "a" else ""
        link_el = card.select_one("a[href]") if not url else None
        if link_el:
            url = link_el.get("href", "")
        if not url:
            return None

        # Title: "Nissan • March" – split on bullet or space
        title_el = card.select_one("[class*=cardProduct__title]")
        title_text = self.clean_str(title_el.get_text(" ") if title_el else "")
        # Remove bullet separators
        title_text = re.sub(r"\s*[•·]\s*", " ", title_text or "").strip()
        if not title_text:
            return None

        # Subtitle: "2015 • 95.000 km • 1.6 SENCE AC • Manual"
        sub_el = card.select_one("[class*=cardProduct__subtitle]")
        sub_text = sub_el.get_text(" ", strip=True) if sub_el else ""
        parts = [p.strip() for p in re.split(r"[•·]", sub_text) if p.strip()]

        year:  Optional[int] = None
        km:    Optional[int] = None
        trans: Optional[str] = None
        engine: Optional[str] = None
        for part in parts:
            if re.match(r"^(19[6-9]\d|20[0-2]\d)$", part):
                year = int(part)
            elif re.search(r"km", part, re.IGNORECASE):
                km = self.parse_km(part)
            elif part.lower() in ("manual", "automático", "automatico", "cvt"):
                trans = self.clean_str(part)
            elif re.match(r"[\d.]+\s*[a-zA-Z]", part):
                engine = self.clean_str(part)

        # Price
        price_el = card.select_one("[class*=uki-amount__large__price]")
        price = self.parse_price(price_el.get_text() if price_el else "")

        # Location
        loc_el = card.select_one("[class*=footerInfo]")
        location = self.clean_str(loc_el.get_text() if loc_el else "")

        # Image
        img_el = card.select_one("img[src]")
        image_url: Optional[str] = None
        if img_el:
            src = img_el.get("src", "")
            if src and "data:image" not in src:
                image_url = src

        # Brand / model from title (e.g. "Nissan March")
        title_parts = title_text.split()
        brand = title_parts[0] if title_parts else None
        model = " ".join(title_parts[1:]) if len(title_parts) > 1 else None

        # Full URL
        if url.startswith("/"):
            url = BASE_URL + url

        uid = hashlib.md5(url.encode()).hexdigest()[:10]
        return CarListing(
            id           = f"kv_{uid}",
            source       = self.source_id,
            title        = title_text,
            brand        = brand,
            model        = model,
            year         = year,
            km           = km,
            price        = price,
            currency     = "CLP",
            condition    = "used",
            transmission = trans,
            engine       = engine,
            location     = location or None,
            image_url    = image_url,
            url          = url,
        )
