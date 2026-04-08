"""
SOAP (Seguro Obligatorio de Accidentes Personales) — verificación de vigencia.
Intenta consultar en autoseguro.gob.cl (sección SOAP) y AACH.
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
SOURCES = [
    "https://soap.aach.cl/ConsultaVigencia.aspx",
    "https://www.aach.cl/soap/consulta",
    "https://soap.aach.cl/",
]


async def _try_aach(patente: str) -> dict | None:
    for url in SOURCES:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                ctx = await browser.new_context(user_agent=UA, locale="es-CL")
                page = await ctx.new_page()

                resp = await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                if not resp or resp.status >= 400:
                    await browser.close()
                    continue

                await page.wait_for_timeout(1500)

                # Buscar campo patente
                for sel in ["#ppu", "#PPU", "#patente", "input[name='ppu']",
                             "input[placeholder*='patente' i]"]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.fill(patente)
                            break
                    except Exception:
                        pass

                for sel in ["button[type='submit']", "input[type='submit']", ".btn-consultar", ".btn-primary"]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.click()
                            break
                    except Exception:
                        pass

                try:
                    await page.wait_for_load_state("networkidle", timeout=12000)
                except Exception:
                    await page.wait_for_timeout(3000)

                html      = await page.content()
                body_text = await page.evaluate("document.body.innerText")
                await browser.close()

            text_lower = body_text.lower()

            if "vigente" in text_lower or "compañía" in text_lower or "póliza" in text_lower:
                soup = BeautifulSoup(html, "html.parser")
                result = {"status": "ok", "fuente": url}

                for table in soup.find_all("table"):
                    for row in table.find_all("tr"):
                        cells = row.find_all(["th", "td"])
                        if len(cells) == 2:
                            k = cells[0].get_text(strip=True).lower()
                            v = cells[1].get_text(strip=True)
                            if "compañ" in k or "asegura" in k:
                                result["compania"] = v
                            elif "vigencia" in k or "vence" in k or "hasta" in k:
                                result["vigencia_hasta"] = v
                            elif "desde" in k or "inicio" in k:
                                result["vigencia_desde"] = v
                            elif "póliza" in k or "poliza" in k or "número" in k:
                                result["poliza"] = v

                comp_m = re.search(r"(?:compañía|aseguradora)[:\s]+([A-ZÁÉÍÓÚÑ][^\n\r,]{3,})", body_text, re.IGNORECASE)
                if comp_m and "compania" not in result:
                    result["compania"] = comp_m.group(1).strip()

                return result

            if "no vigente" in text_lower or "vencido" in text_lower or "sin soap" in text_lower:
                return {"status": "alert", "message": "SOAP vencido o no registrado", "fuente": url}

        except Exception:
            continue

    return None


async def check_soap(patente: str) -> dict:
    resultado = await _try_aach(patente)
    if resultado:
        return resultado

    return {
        "status": "unavailable",
        "message": "SOAP no consultable automáticamente. Verifica en tu aseguradora.",
        "direct_url": "https://www.cmfchile.cl/portal/principal/613/w3-article-10975.html",
        "hint": "Aseguradoras SOAP: BCI, HDI, Metlife, Penta, Consorcio, Security, Chilena Consolidada.",
    }
