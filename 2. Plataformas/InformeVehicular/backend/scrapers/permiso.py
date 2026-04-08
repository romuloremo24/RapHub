"""
Permiso de Circulación — Tesorería General de la República (TGR)
Usa Clave Única para autenticar y consultar deuda vehicular.
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import os
import re
from .clave_unica import do_login

UA          = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
TGR_URL     = "https://www.tgr.cl/servicios/permiso-de-circulacion/"
TGR_DEUDA   = "https://www.tgr.cl/servicios/impuesto-vehicular/"


async def check_permiso(patente: str) -> dict:
    if not os.getenv("CLAVE_UNICA_RUT") or not os.getenv("CLAVE_UNICA_PASS"):
        return {
            "status": "unavailable",
            "message": "Verifica CLAVE_UNICA_RUT y CLAVE_UNICA_PASS en el archivo .env.",
            "direct_url": TGR_URL,
        }

    result = {
        "status": "unavailable",
        "direct_url": TGR_URL,
        "message": "Consulta disponible en tgr.cl",
    }
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(
                user_agent=UA, locale="es-CL",
                viewport={"width": 1280, "height": 800},
            )
            page = await ctx.new_page()

            # Intentar URL pública de consulta de deuda
            await page.goto(TGR_DEUDA, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            body_text = await page.evaluate("document.body.innerText")
            text_lower = body_text.lower()

            # Si hay campo de patente público, usarlo
            ppu_found = False
            for sel in ["#ppu", "#PPU", "#patente", "#txtPatente",
                         "input[name='ppu']", "input[placeholder*='patente' i]"]:
                try:
                    el = await page.query_selector(sel)
                    if el and await el.is_visible():
                        await el.fill(patente)
                        ppu_found = True
                        break
                except Exception:
                    pass

            # Si requiere Clave Única, hacer login
            if not ppu_found or "clave única" in text_lower or "ingresar" in text_lower:
                for sel in [
                    "a:has-text('Clave Única')", "button:has-text('Clave Única')",
                    "a:has-text('Acceder')", ".btn-clave-unica",
                    "a[href*='claveunica']", "a[href*='login']",
                ]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.click()
                            break
                    except Exception:
                        pass

                logged_in = await do_login(page)
                if not logged_in:
                    await browser.close()
                    return {
                        "status": "unavailable",
                        "message": "TGR requiere Clave Única. Verifica CLAVE_UNICA_RUT y CLAVE_UNICA_PASS.",
                        "direct_url": TGR_URL,
                    }

                await page.wait_for_timeout(2000)

                # Buscar campo de patente post-login
                for sel in ["#ppu", "#PPU", "#patente", "#txtPatente",
                             "input[name='ppu']", "input[placeholder*='patente' i]"]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.fill(patente)
                            ppu_found = True
                            break
                    except Exception:
                        pass

            if ppu_found:
                for sel in ["button[type='submit']", "input[type='submit']", "#btnBuscar", ".btn-primary"]:
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
                    await page.wait_for_timeout(4000)

            html      = await page.content()
            body_text = await page.evaluate("document.body.innerText")
            await browser.close()

        text_lower = body_text.lower()

        if "sin deuda" in text_lower or "al día" in text_lower or "pagado" in text_lower or "no registra deuda" in text_lower:
            result["status"]  = "ok"
            result["message"] = "Sin deuda de permiso de circulación"
            monto = re.search(r"año\s+\d{4}[:\s]+(\$[\d.,]+)", body_text, re.IGNORECASE)
            if monto:
                result["detalle"] = monto.group(0)
        elif "deuda" in text_lower or "pendiente" in text_lower or "debe pagar" in text_lower:
            result["status"]  = "alert"
            result["message"] = "Tiene deuda de permiso de circulación"
            m = re.search(r"\$\s*([\d.,]+)", body_text)
            if m:
                result["deuda"] = m.group(0)
            # Intentar extraer tabla de deudas por año
            soup = BeautifulSoup(html, "html.parser")
            deudas = []
            for row in soup.select("table tr")[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if len(cells) >= 2:
                    deudas.append({"periodo": cells[0], "monto": cells[-1]})
            if deudas:
                result["deudas"] = deudas
        elif "clave única" in text_lower or "clave unica" in text_lower:
            result["message"] = "TGR requiere Clave Única. Verifica las credenciales."

    except Exception as e:
        result["status"]  = "unavailable"
        result["message"] = str(e)

    return result
