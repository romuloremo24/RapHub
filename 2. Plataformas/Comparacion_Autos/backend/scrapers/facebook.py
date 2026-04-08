"""Facebook Marketplace Chile – curl_cffi scraper with optional session cookies."""
from __future__ import annotations
import hashlib, json, logging, re
from pathlib import Path
from typing import List, Optional
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
from .base import BaseScraper, CarListing, SearchFilters

logger = logging.getLogger(__name__)

BASE_URL    = "https://www.facebook.com"
SEARCH_URL  = "https://www.facebook.com/marketplace/chile/vehicles"
COOKIES_FILE = Path(__file__).parent.parent / "facebook_cookies.json"

_BRANDS = [
    "Toyota", "Hyundai", "Kia", "Nissan", "Chevrolet", "Volkswagen",
    "Mazda", "Honda", "Mitsubishi", "Suzuki", "Subaru", "Ford",
    "Renault", "Peugeot", "Citroën", "Citroen", "Fiat", "Chery",
    "BMW", "Audi", "Mercedes", "Volvo", "Jeep", "Dodge", "Chrysler",
    "Alfa Romeo", "Seat", "Skoda", "Opel", "Land Rover", "Lexus",
    "Infiniti", "Geely", "BYD", "DFSK", "JAC", "Haval", "MG",
    "Great Wall", "Changan", "Ssangyong", "Lifan",
]


class FacebookMarketplaceScraper(BaseScraper):
    source_id   = "facebook"
    source_name = "Facebook Marketplace"

    def __init__(self):
        super().__init__()
        self._cf_session = cffi_requests.AsyncSession(impersonate="chrome120")
        self._load_cookies()

    def _load_cookies(self):
        if not COOKIES_FILE.exists():
            return
        try:
            cookies = json.loads(COOKIES_FILE.read_text(encoding="utf-8"))
            for ck in cookies:
                self._cf_session.cookies.set(
                    ck["name"], ck["value"],
                    domain=ck.get("domain", ".facebook.com"),
                    path=ck.get("path", "/"),
                )
            logger.info("Facebook: loaded %d cookies", len(cookies))
        except Exception as exc:
            logger.warning("Facebook: failed to load cookies: %s", exc)

    async def __aexit__(self, *args):
        await self.client.aclose()
        await self._cf_session.close()

    async def search(self, filters: SearchFilters) -> List[CarListing]:
        has_cookies = COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 10

        if has_cookies:
            return await self._search_playwright(filters)

        # No auth: base URL has SSR data (non-CL listings filtered by _parse_item)
        try:
            resp = await self._cf_session.get(
                SEARCH_URL,
                headers={"Accept-Language": "es-CL,es;q=0.9"},
            )
            if resp.status_code != 200:
                logger.warning("Facebook Marketplace HTTP %s", resp.status_code)
                return []
            html = resp.text
        except Exception as exc:
            logger.error("Facebook Marketplace error: %s", exc)
            return []

        return self._parse(html, filters)

    async def _search_playwright(self, filters: SearchFilters) -> List[CarListing]:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("playwright not installed")
            return []

        parts = [p for p in [filters.brand, filters.model, filters.query] if p]
        url = SEARCH_URL
        if parts:
            query = " ".join(parts)
            url += f"?query={query.replace(' ', '%20')}&exact=false"
            if filters.price_from:
                url += f"&minPrice={int(filters.price_from)}"
            if filters.price_to:
                url += f"&maxPrice={int(filters.price_to)}"

        try:
            cookies = json.loads(COOKIES_FILE.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.error("Facebook: failed to read cookies: %s", exc)
            return []

        try:
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(
                    headless=True,
                    args=["--no-sandbox"],
                )
                ctx = await browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    locale="es-CL",
                    viewport={"width": 1280, "height": 900},
                )
                await ctx.add_cookies(cookies)
                page = await ctx.new_page()
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                # Wait for marketplace listings to appear in the DOM
                try:
                    await page.wait_for_selector(
                        "[data-testid='marketplace_feed_item'], [aria-label='Marketplace']",
                        timeout=8000,
                    )
                except Exception:
                    pass
                await page.wait_for_timeout(2000)
                # Scroll to trigger infinite scroll and load more listings
                for _ in range(7):
                    await page.evaluate("window.scrollBy(0, window.innerHeight * 3)")
                    await page.wait_for_timeout(1500)
                html = await page.content()
                await browser.close()

            logger.info("Facebook: got %d chars of HTML (authenticated)", len(html))
            return self._parse(html, filters)
        except Exception as exc:
            logger.error("Facebook Playwright error: %s", exc)
            return []

    def _parse(self, html: str, filters: SearchFilters) -> List[CarListing]:
        soup = BeautifulSoup(html, "lxml")
        results: List[CarListing] = []

        # Facebook SSR embeds listing data in application/json script tags
        listings = self._extract_listings(soup)

        for item in listings:
            try:
                r = self._parse_item(item)
                if not r:
                    continue
                if filters.brand and r.title:
                    if self._norm(filters.brand) not in self._norm(r.title):
                        continue
                if self.passes_filters(r, filters):
                    results.append(r)
            except Exception:
                continue

        logger.info("Facebook Marketplace: %d results", len(results))
        return results[:filters.limit]

    def _extract_listings(self, soup) -> list:
        listings = []
        for s in soup.find_all("script", type="application/json"):
            text = s.string or ""
            if '"marketplace_listing_title"' not in text:
                continue
            try:
                data = json.loads(text)
                listings.extend(self._deep_find(data, "marketplace_listing_title"))
            except Exception:
                continue
        return listings

    def _deep_find(self, obj, key: str, depth: int = 0) -> list:
        if depth > 25:
            return []
        results = []
        if isinstance(obj, dict):
            if key in obj:
                results.append(obj)
            for v in obj.values():
                results.extend(self._deep_find(v, key, depth + 1))
        elif isinstance(obj, list):
            for item in obj:
                results.extend(self._deep_find(item, key, depth + 1))
        return results

    _CHILE_REGIONS = {
        "metropolitana", "valparaíso", "valparaiso", "biobío", "biobio",
        "araucanía", "araucania", "maule", "los lagos", "antofagasta",
        "coquimbo", "tarapacá", "tarapaca", "atacama", "los ríos", "los rios",
        "aysén", "aysen", "magallanes", "ñuble", "nuble", "arica", "o'higgins",
        "ohiggins", "santiago", "chile", "cl",
    }

    def _parse_item(self, item: dict) -> Optional[CarListing]:
        listing_id = item.get("id") or ""
        title = self.clean_str(item.get("marketplace_listing_title") or item.get("custom_title") or "") or "Auto"
        if not listing_id or not title:
            return None

        # Geographic filter: only keep Chilean listings
        loc_obj = (item.get("location") or {}).get("reverse_geocode") or {}
        city       = (loc_obj.get("city") or "").lower()
        state      = (loc_obj.get("state") or "").lower()
        country    = (loc_obj.get("country") or "").lower()
        loc_text   = f"{city} {state} {country}"
        if not any(r in loc_text for r in self._CHILE_REGIONS):
            return None  # Not a Chilean listing

        url = f"{BASE_URL}/marketplace/item/{listing_id}/"

        # Price (FB stores CLP as raw amount with offset=1)
        price_obj = item.get("listing_price") or {}
        price: Optional[float] = None
        amount_str = price_obj.get("amount") or ""
        if amount_str:
            try:
                price = float(amount_str)
            except ValueError:
                pass

        # Subtitles: may contain km and year
        subtitles = " ".join(
            s.get("subtitle", "") for s in (item.get("custom_sub_titles_with_rendering_flags") or [])
        )
        full_text = f"{title} {subtitles}"
        year = self.parse_year(full_text)

        km_m = re.search(r"([\d.,]+)\s*(?:mil\s*)?(?:km|millas|miles)", subtitles, re.IGNORECASE)
        km: Optional[int] = None
        if km_m:
            km_raw = km_m.group(1).replace(".", "").replace(",", "")
            km_val = int(km_raw) if km_raw.isdigit() else None
            if km_val and "mil" in subtitles.lower() and km_val < 1000:
                km_val *= 1000
            km = km_val

        location: Optional[str] = f"{loc_obj.get('city', '')}, {loc_obj.get('state', '')}".strip(", ") or None

        photo = item.get("primary_listing_photo") or {}
        image_url = (photo.get("image") or {}).get("uri") or None

        brand: Optional[str] = None
        model: Optional[str] = None
        title_lower = title.lower()
        for b in _BRANDS:
            if b.lower() in title_lower:
                brand = b
                m = re.search(r"\b" + re.escape(b) + r"\s+([A-Za-z0-9\-]+)", title, re.IGNORECASE)
                model = m.group(1) if m else None
                break

        uid = hashlib.md5(url.encode()).hexdigest()[:10]
        return CarListing(
            id        = f"fb_{uid}",
            source    = self.source_id,
            title     = title[:120],
            brand     = brand,
            model     = model,
            year      = year,
            km        = km,
            price     = price,
            currency  = "CLP",
            condition = "used",
            location  = location,
            image_url = image_url,
            url       = url,
        )
