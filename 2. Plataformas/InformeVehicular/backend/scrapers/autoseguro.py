"""
Scraper para autoseguro.gob.cl — encargo por robo.
Usa CapSolver para resolver el reCAPTCHA v2 automáticamente.
"""
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from .captcha_solver import solve_recaptcha_v2

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
BASE_URL   = "https://www.autoseguro.gob.cl/"
PPU_INPUT  = "#txt_placa_patente"
PPU_SUBMIT = "#btnPpuClick"


async def check_autoseguro(patente: str) -> dict:
    result = {"status": "unknown", "sources": [], "direct_url": f"{BASE_URL}?PPU={patente}"}
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(
                user_agent=UA, locale="es-CL",
                viewport={"width": 1280, "height": 800},
            )
            page = await ctx.new_page()

            await page.goto(BASE_URL, timeout=30000, wait_until="domcontentloaded")
            try:
                await page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                await page.wait_for_timeout(2000)
            await page.wait_for_timeout(1500)

            # Extraer site key del reCAPTCHA
            site_key = await page.evaluate("""() => {
                const el = document.querySelector('.g-recaptcha');
                if (el) return el.getAttribute('data-sitekey');
                for (const f of document.querySelectorAll('iframe[src*="recaptcha"]')) {
                    const m = f.src.match(/[?&]k=([^&]+)/);
                    if (m) return m[1];
                }
                return null;
            }""")

            if site_key:
                token = await solve_recaptcha_v2(site_key, BASE_URL)
                if token:
                    await page.evaluate(f"""
                        document.querySelectorAll('[name="g-recaptcha-response"]').forEach(e => {{
                            e.value = '{token}';
                            e.style.display = 'block';
                        }});
                    """)

            ppu_el    = await page.query_selector(PPU_INPUT)
            submit_el = await page.query_selector(PPU_SUBMIT)
            if not ppu_el or not submit_el:
                await browser.close()
                return {
                    "status": "captcha_required",
                    "message": "autoseguro.gob.cl: formulario no encontrado. El sitio puede estar bloqueando el acceso o haber cambiado su estructura.",
                    "direct_url": BASE_URL,
                }
            await ppu_el.fill(patente)
            await page.wait_for_timeout(500)
            await submit_el.click()

            try:
                await page.wait_for_load_state("networkidle", timeout=12000)
            except Exception:
                await page.wait_for_timeout(3000)

            html      = await page.content()
            body_text = await page.evaluate("document.body.innerText")
            await browser.close()

        text_lower = body_text.lower()

        if "captcha no es válido" in text_lower or (
            "captcha" in text_lower
            and "sin encargo" not in text_lower
            and "encargo" not in text_lower
        ):
            result["status"] = "captcha_required"
            result["message"] = "CapSolver no resolvió el CAPTCHA. Verifica CAPSOLVER_API_KEY y saldo."
            return result

        soup = BeautifulSoup(html, "html.parser")

        if "sin encargo" in text_lower:
            result["status"] = "ok"
        elif "con encargo" in text_lower or "encargo activo" in text_lower:
            result["status"] = "alert"

        for row in soup.select("table tr"):
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cells) >= 2:
                result["sources"].append({"identifier": cells[0], "state": cells[1]})

        if not result["sources"] and result["status"] in ("ok", "alert"):
            label = "Sin encargo" if result["status"] == "ok" else "CON ENCARGO"
            result["sources"] = [{"identifier": "Patente", "state": label}]

        if result["status"] == "unknown":
            result["status"] = "captcha_required"
            result["message"] = "Sin resultado. Verifica CAPSOLVER_API_KEY y saldo de la cuenta."

    except Exception as e:
        return {"status": "error", "message": str(e), "direct_url": BASE_URL}

    return result
