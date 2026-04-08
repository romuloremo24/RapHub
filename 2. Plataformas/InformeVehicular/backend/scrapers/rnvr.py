"""
RNVR — Registro Nacional de Vehículos Rodantes (Registro Civil de Chile)
Consulta datos técnicos del vehículo e historial de propietarios.
Requiere Clave Única.
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import os
import re
from .clave_unica import do_login

UA       = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
RC_URL   = "https://www.registrocivil.cl/principal/servicios-en-linea"
RNVR_URL = "https://www.registrocivil.cl/principal/servicios-en-linea#main=com_snrc"


def _parse_table_pairs(soup, container_sel: str) -> dict:
    data = {}
    for container in soup.select(container_sel):
        rows = container.find_all("tr")
        for row in rows:
            cells = row.find_all(["th", "td"])
            if len(cells) == 2:
                key = cells[0].get_text(strip=True).rstrip(":").lower()
                val = cells[1].get_text(strip=True)
                data[key] = val
    return data


async def check_rnvr(patente: str) -> dict:
    return {
        "status": "unavailable",
        "message": "El RNVR del Registro Civil solo muestra datos del propietario registrado. Consulta directamente con tu Clave Única.",
        "direct_url": RNVR_URL,
        "hint": "Alternativas con costo: Autofact (autofact.cl) o Checkcar.",
    }
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(
                user_agent=UA, locale="es-CL",
                viewport={"width": 1280, "height": 800},
            )
            page = await ctx.new_page()

            # Intentar acceso directo al RNVR
            await page.goto(RC_URL, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            # Buscar sección de vehículos
            vehicle_selectors = [
                "a:has-text('Vehículos')", "a:has-text('RNVR')",
                "a:has-text('Dominio Vigente')", "a[href*='vehiculo']",
                "a[href*='snrc']", ".servicio-vehiculos",
            ]
            for sel in vehicle_selectors:
                try:
                    el = await page.query_selector(sel)
                    if el and await el.is_visible():
                        await el.click()
                        await page.wait_for_load_state("networkidle", timeout=10000)
                        break
                except Exception:
                    pass

            # Buscar botón de Clave Única
            cu_selectors = [
                "a:has-text('Clave Única')", "button:has-text('Clave Única')",
                ".btn-clave-unica", "a[href*='claveunica']",
                "a:has-text('Ingresar')", "a:has-text('Acceder')",
            ]
            for sel in cu_selectors:
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
                    "message": "Registro Civil: login con Clave Única falló. Verifica CLAVE_UNICA_RUT y CLAVE_UNICA_PASS.",
                    "direct_url": RC_URL,
                }

            await page.wait_for_timeout(2000)

            # Buscar formulario de consulta por patente
            ppu_found = False
            for sel in [
                "#ppu", "#PPU", "#patente", "#txtPPU",
                "input[name='ppu']", "input[name='PPU']",
                "input[placeholder*='patente' i]", "input[placeholder*='PPU' i]",
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
                # Intentar navegar directo con la patente en la URL
                for url_pattern in [
                    f"{RC_URL}?ppu={patente}",
                    f"https://www.registrocivil.cl/principal/servicios-en-linea/vehiculos?ppu={patente}",
                ]:
                    await page.goto(url_pattern, timeout=20000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(2000)
                    for sel in ["#ppu", "#PPU", "#patente", "input[name='ppu']"]:
                        try:
                            el = await page.query_selector(sel)
                            if el and await el.is_visible():
                                await el.fill(patente)
                                ppu_found = True
                                break
                        except Exception:
                            pass
                    if ppu_found:
                        break

            if ppu_found:
                for sel in ["button[type='submit']", "input[type='submit']", "#btnConsultar", ".btn-primary"]:
                    try:
                        el = await page.query_selector(sel)
                        if el and await el.is_visible():
                            await el.click()
                            break
                    except Exception:
                        pass
                try:
                    await page.wait_for_load_state("networkidle", timeout=20000)
                except Exception:
                    await page.wait_for_timeout(5000)

            html      = await page.content()
            body_text = await page.evaluate("document.body.innerText")
            await browser.close()

        text_lower = body_text.lower()
        soup = BeautifulSoup(html, "html.parser")

        # Detectar error de login
        if "clave única" in text_lower and "registr" not in text_lower:
            return {
                "status": "unavailable",
                "message": "Login con Clave Única no completado.",
                "direct_url": RC_URL,
            }

        # Parsear datos técnicos desde tablas
        datos = {}
        propietarios = []

        # Extraer todos los pares clave-valor de tablas
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["th", "td"])
                if len(cells) == 2:
                    k = cells[0].get_text(strip=True).rstrip(":").strip()
                    v = cells[1].get_text(strip=True)
                    if k and v:
                        datos[k] = v

        # Intentar extraer con regex desde texto plano
        field_patterns = [
            ("marca",       r"(?:marca|brand)[:\s]+([A-Z][A-Z\s]+)"),
            ("modelo",      r"(?:modelo|model)[:\s]+([A-Z0-9][^\n\r,]+)"),
            ("año",         r"(?:año|year)[:\s]+(\d{4})"),
            ("color",       r"(?:color)[:\s]+([A-Za-z]+)"),
            ("vin",         r"(?:vin|chasis|bastidor|n[°º]\s*bastidor)[:\s]+([A-Z0-9]{5,})"),
            ("motor",       r"(?:motor|n[°º]\s*motor)[:\s]+([A-Z0-9]{4,})"),
            ("combustible", r"(?:combustible|tipo combustible)[:\s]+([A-Za-z]+)"),
            ("propietario", r"(?:propietario|dueño|titular)[:\s]+([A-ZÁÉÍÓÚÑ][^\n\r,]{3,})"),
            ("rut_prop",    r"(?:rut propietario|rut)[:\s]+(\d{1,8}[-]\d|[\d.]+[-]\d)"),
        ]
        for field, pattern in field_patterns:
            if field not in datos:
                m = re.search(pattern, body_text, re.IGNORECASE)
                if m:
                    datos[field] = m.group(1).strip()

        # Historial de propietarios (múltiples dueños en tabla)
        for table in soup.find_all("table"):
            headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
            if any(h in " ".join(headers) for h in ["propietario", "dueño", "nombre", "titular"]):
                for row in table.find_all("tr")[1:]:
                    cells = [td.get_text(strip=True) for td in row.find_all("td")]
                    if len(cells) >= 2 and any(c.strip() for c in cells):
                        propietarios.append({
                            "nombre": cells[0] if cells else "—",
                            "rut":    cells[1] if len(cells) > 1 else "—",
                            "fecha":  cells[2] if len(cells) > 2 else "—",
                        })

        if datos or propietarios:
            result["status"] = "ok"
            result.pop("message", None)
            result.pop("direct_url", None)
            if datos:
                result["datos_tecnicos"] = datos
            if propietarios:
                result["propietarios"] = propietarios
        elif patente.lower() in body_text.lower():
            result["status"]  = "ok_no_data"
            result["message"] = "Patente encontrada pero sin datos estructurados"
        else:
            result["message"] = "No se encontraron datos. Verifica credenciales y acceso al RNVR."

    except Exception as e:
        result["status"]  = "unavailable"
        result["message"] = f"No se pudo conectar al Registro Civil: {e}"

    return result
