"""
Scraper para pasastesintag.cl
Input:  #inputPatente
Submit: button.btn.w-100.btn-primary (texto "Consulta")
Popup:  .swal2-confirm / .btnConfirmar  → aceptar antes de poder usar el formulario
Result: #contResumenBajo
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
URL = "https://pasastesintag.cl/"


async def check_pasastesintag(patente: str) -> dict:
    result = {
        "status": "ok",
        "pending_count": 0,
        "total_debt": 0,
        "transits": [],
        "message": None,
    }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(user_agent=UA, locale="es-CL")
            page = await ctx.new_page()

            await page.goto(URL, timeout=30000, wait_until="domcontentloaded")
            try:
                await page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                await page.wait_for_timeout(2000)

            # Cerrar popup de aviso legal si aparece
            for popup_sel in [".swal2-confirm", ".btnConfirmar", "button:has-text('Aceptar')"]:
                try:
                    el = await page.query_selector(popup_sel)
                    if el and await el.is_visible():
                        await el.click()
                        await page.wait_for_timeout(600)
                        break
                except Exception:
                    pass

            # Llenar patente (sin dígito verificador — pasastesintag lo pide sin él)
            input_el  = await page.query_selector("#inputPatente")
            submit_el = await page.query_selector("button.btn.w-100.btn-primary")
            if not input_el or not submit_el:
                await browser.close()
                return {
                    "status": "unavailable",
                    "message": "pasastesintag.cl: formulario no encontrado. El sitio puede estar caído o haber cambiado su estructura.",
                    "direct_url": URL,
                }
            await input_el.fill(patente)
            await submit_el.click()

            # Esperar que #contResumenBajo tenga texto real
            try:
                await page.wait_for_function(
                    "document.getElementById('contResumenBajo') && document.getElementById('contResumenBajo').innerText.trim().length > 10",
                    timeout=15000,
                )
            except Exception:
                await page.wait_for_timeout(8000)

            raw_text = ""
            el = await page.query_selector("#contResumenBajo")
            if el:
                raw_text = (await el.text_content() or "").strip()

            html = await page.content()
            await browser.close()

        if not raw_text:
            return {"status": "unavailable", "message": "No se pudo obtener resultado de pasastesintag.cl"}

        result["message"] = raw_text
        text_lower = raw_text.lower()

        # Estado
        if any(w in text_lower for w in ["no registra deuda", "no registra", "sin deuda"]):
            result["status"] = "ok"
        elif any(w in text_lower for w in ["deuda", "pendiente", "debe pagar", "tránsito"]):
            result["status"] = "alert"

        # Parsear tabla de tránsitos si hay deuda
        if result["status"] == "alert":
            soup = BeautifulSoup(html, "html.parser")
            tables = soup.find_all("table")
            for table in tables:
                rows = table.find_all("tr")
                for row in rows[1:]:
                    cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                    if len(cells) >= 2 and any(c.strip() for c in cells):
                        result["transits"].append({
                            "date":    cells[0] if cells else "",
                            "highway": cells[1] if len(cells) > 1 else "",
                            "amount":  cells[2] if len(cells) > 2 else "",
                        })
                        result["pending_count"] += 1

            # Monto total
            money_m = re.search(r"\$\s*([\d.,]+)", raw_text)
            if money_m:
                try:
                    result["total_debt"] = int(money_m.group(1).replace(".", "").replace(",", ""))
                except ValueError:
                    pass

    except Exception as e:
        return {"status": "error", "message": str(e)}

    return result
