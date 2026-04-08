"""
Multas de Tránsito — Juzgados de Policía Local (JPL)
Portal nacional: consultas.jpl.gob.cl
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

UA  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
URL = "https://consultas.jpl.gob.cl/"
FALLBACK_URLS = [
    "https://consultas.jpl.gob.cl/consulta",
    "https://jpl.gob.cl/",
    "https://www.jpl.cl/",
]


async def check_multas(patente: str) -> dict:
    result = {
        "status": "unavailable",
        "message": "Portal JPL no disponible",
        "direct_url": URL,
        "total_multas": 0,
        "multas": [],
    }
    all_urls = [URL] + FALLBACK_URLS

    for base_url in all_urls:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                ctx = await browser.new_context(user_agent=UA, locale="es-CL")
                page = await ctx.new_page()

                resp = await page.goto(base_url, timeout=20000, wait_until="domcontentloaded")
                if not resp or resp.status >= 400:
                    await browser.close()
                    continue

                await page.wait_for_timeout(1500)

                # Buscar campo de patente / PPU
                ppu_found = False
                for sel in [
                    "#ppu", "#PPU", "#patente", "#txtPatente", "#inputPatente",
                    "input[name='ppu']", "input[name='PPU']",
                    "input[placeholder*='patente' i]", "input[placeholder*='PPU' i]",
                    "input[type='text']",
                ]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.fill(patente)
                            ppu_found = True
                            break
                    except Exception:
                        pass

                if not ppu_found:
                    await browser.close()
                    continue

                for sel in [
                    "button[type='submit']", "input[type='submit']",
                    "#btnBuscar", "#btnConsultar", ".btn-primary",
                    "button:has-text('Consultar')", "button:has-text('Buscar')",
                ]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.click()
                            break
                    except Exception:
                        pass

                try:
                    await page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    await page.wait_for_timeout(5000)

                html      = await page.content()
                body_text = await page.evaluate("document.body.innerText")
                await browser.close()

            text_lower = body_text.lower()

            if "sin multas" in text_lower or "no registra multas" in text_lower or "no tiene multas" in text_lower:
                return {
                    "status": "ok",
                    "message": "Sin multas de tránsito registradas en JPL",
                    "total_multas": 0,
                    "multas": [],
                }

            soup = BeautifulSoup(html, "html.parser")
            multas = []

            for table in soup.find_all("table"):
                headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
                if any(h in " ".join(headers) for h in ["multa", "infracción", "tribunal", "fecha", "monto"]):
                    for row in table.find_all("tr")[1:]:
                        cells = [td.get_text(strip=True) for td in row.find_all("td")]
                        if len(cells) >= 2 and any(c.strip() for c in cells):
                            multas.append({
                                "fecha":    cells[0] if cells else "—",
                                "tribunal": cells[1] if len(cells) > 1 else "—",
                                "monto":    cells[2] if len(cells) > 2 else "—",
                                "estado":   cells[3] if len(cells) > 3 else "—",
                            })

            if multas:
                total_m = re.search(r"total[:\s]+\$?([\d.,]+)", body_text, re.IGNORECASE)
                return {
                    "status": "alert",
                    "total_multas": len(multas),
                    "total_deuda": total_m.group(1) if total_m else None,
                    "multas": multas,
                }

            if patente.lower() in body_text.lower() and "multa" in text_lower:
                return {
                    "status": "ok",
                    "message": "Sin multas pendientes",
                    "total_multas": 0,
                    "multas": [],
                }

        except Exception:
            continue

    return result
