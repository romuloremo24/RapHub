"""
Scraper para Revisión Técnica — prt.cl
Usa CapSolver para resolver el reCAPTCHA v2 automáticamente.
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import os
import re
from .captcha_solver import solve_recaptcha_v2

UA       = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
BASE_URL = "https://www.prt.cl/"


async def check_prt(patente: str) -> dict:
    if not os.getenv("CAPSOLVER_API_KEY"):
        return {
            "status": "captcha_required",
            "message": "prt.cl requiere resolver un reCAPTCHA. Agrega CAPSOLVER_API_KEY en el archivo .env para automatizar esta consulta (capsolver.com).",
            "direct_url": BASE_URL,
        }
    result = {"status": "unknown", "direct_url": BASE_URL}
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(
                user_agent=UA, locale="es-CL",
                viewport={"width": 1280, "height": 800},
            )
            page = await ctx.new_page()

            await page.goto(BASE_URL, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_timeout(4000)

            # Extraer site key del reCAPTCHA desde HTML y frames
            html_content = await page.content()
            site_key = None
            m = re.search(r'[?&]k=(6[A-Za-z0-9_-]{39})', html_content)
            if m:
                site_key = m.group(1)
            if not site_key:
                for f in page.frames:
                    fm = re.search(r'[?&]k=(6[A-Za-z0-9_-]{39})', f.url)
                    if fm:
                        site_key = fm.group(1)
                        break
            if not site_key:
                site_key_js = await page.evaluate("""() => {
                    const el = document.querySelector('.g-recaptcha');
                    if (el) return el.getAttribute('data-sitekey');
                    return null;
                }""")
                site_key = site_key_js

            if site_key:
                token = await solve_recaptcha_v2(site_key, BASE_URL)
                if token:
                    await page.evaluate(f"""
                        document.querySelectorAll('[name="g-recaptcha-response"]').forEach(e => {{
                            e.value = '{token}';
                            e.style.display = 'block';
                        }});
                        if (window.___grecaptcha_cfg) {{
                            try {{
                                const id = Object.keys(window.___grecaptcha_cfg.clients)[0];
                                const client = window.___grecaptcha_cfg.clients[id];
                                const keys = Object.keys(client);
                                for (const k of keys) {{
                                    if (client[k] && client[k].callback) {{
                                        client[k].callback('{token}');
                                        break;
                                    }}
                                }}
                            }} catch(e) {{}}
                        }}
                    """)

            # Buscar campo de patente — selectores reales de prt.cl
            ppu_selectors = [
                "#ContentPlaceHolder1_patenteInput",
                "#txtPPU", "#ppu", "#PPU", "#inputPPU",
                "input[name='ctl00$ContentPlaceHolder1$patenteInput']",
                "input[name='ppu']", "input[name='PPU']",
                "input[placeholder*='patente' i]",
            ]
            input_found = False
            for sel in ppu_selectors:
                try:
                    el = await page.query_selector(sel)
                    if el and await el.is_visible():
                        await el.fill(patente)
                        input_found = True
                        break
                except Exception:
                    pass

            if not input_found:
                await browser.close()
                return {
                    "status": "captcha_required",
                    "message": "prt.cl: no se encontró campo de patente. Verifica la estructura del sitio.",
                    "direct_url": BASE_URL,
                }

            await page.wait_for_timeout(800)

            # Submit — prt.cl usa input[type=image] como botón
            submit_selectors = [
                "#ContentPlaceHolder1_buscar",
                "#btnBuscar", "#btnConsultar", "#btnSubmit",
                "input[type='image']", "input[type='submit']",
                "button[type='submit']",
            ]
            for sel in submit_selectors:
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

        soup       = BeautifulSoup(html, "html.parser")
        text_lower = body_text.lower()

        # Detectar bloqueo CAPTCHA
        captcha_phrases = [
            "captcha no es válido", "captcha inválido",
            "complete el captcha", "verifica que no eres un robot",
        ]
        if any(ph in text_lower for ph in captcha_phrases):
            return {
                "status": "captcha_required",
                "message": "CapSolver no resolvió el CAPTCHA de prt.cl. Verifica CAPSOLVER_API_KEY.",
                "direct_url": BASE_URL,
            }

        if any(w in text_lower for w in ["vigente", "aceptada", "aprobada"]):
            result["status"] = "vigente"
        elif any(w in text_lower for w in ["rechazada", "vencida", "no vigente"]):
            result["status"] = "alert"
        elif any(w in text_lower for w in ["sin registros", "no registra", "sin revisión"]):
            result["status"] = "ok_no_data"

        history = []
        for table in soup.find_all("table"):
            for row in table.find_all("tr")[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if len(cells) >= 2 and any(
                    w in " ".join(cells).lower()
                    for w in ["aceptada", "rechazada", "aprobada", "vigente"]
                ):
                    history.append({
                        "fecha":  cells[0],
                        "planta": cells[1] if len(cells) > 1 else "—",
                        "estado": cells[2] if len(cells) > 2 else cells[-1],
                    })

        if history:
            result["history"]       = history
            result["last_revision"] = history[0].get("fecha", "")
            result["plant"]         = history[0].get("planta", "")
            result["result"]        = history[0].get("estado", "")

        exp_m = re.search(r"vencimiento[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", body_text, re.IGNORECASE)
        if exp_m:
            result["expiry_info"] = exp_m.group(1)

        if result["status"] == "unknown":
            result["status"]  = "captcha_required"
            result["message"] = "prt.cl no retornó resultado con CAPTCHA resuelto. Consulta directamente en prt.cl."
            result["direct_url"] = BASE_URL

    except Exception as e:
        result = {
            "status": "captcha_required",
            "message": str(e),
            "direct_url": BASE_URL,
        }

    return result
