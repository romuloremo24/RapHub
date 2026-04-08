"""
Diagnóstico: visita cada sitio y muestra el HTML real para ajustar selectores.
Uso: python diagnose.py JCDS27
"""
import asyncio, sys
from playwright.async_api import async_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
PATENTE = sys.argv[1] if len(sys.argv) > 1 else "JCDS27"

async def dump_site(name, url):
    print(f"\n{'='*60}")
    print(f"  {name}  →  {url}")
    print('='*60)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=UA, locale="es-CL")
        page = await ctx.new_page()
        try:
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle", timeout=15000)

            # Listar todos los inputs
            inputs = await page.query_selector_all("input")
            print(f"\n[INPUTS encontrados: {len(inputs)}]")
            for i, el in enumerate(inputs):
                attrs = {}
                for attr in ["type","name","id","placeholder","class"]:
                    val = await el.get_attribute(attr)
                    if val:
                        attrs[attr] = val
                print(f"  input[{i}]: {attrs}")

            # Listar todos los buttons
            buttons = await page.query_selector_all("button, input[type=submit]")
            print(f"\n[BUTTONS encontrados: {len(buttons)}]")
            for i, el in enumerate(buttons):
                txt = (await el.text_content() or "").strip()
                attrs = {}
                for attr in ["type","name","id","class"]:
                    val = await el.get_attribute(attr)
                    if val:
                        attrs[attr] = val
                print(f"  button[{i}]: text='{txt}' {attrs}")

            # Título de la página
            title = await page.title()
            print(f"\n[TÍTULO]: {title}")

            # Primeros 800 chars del body
            body_text = await page.evaluate("document.body.innerText")
            print(f"\n[BODY TEXT (primeros 800 chars)]:\n{body_text[:800]}")

            # HTML comprimido
            html = await page.content()
            print(f"\n[HTML (primeros 1500 chars)]:\n{html[:1500]}")

        except Exception as e:
            print(f"  ERROR: {e}")
        finally:
            await browser.close()

async def dump_with_submit(name, url, input_sel, input_val, submit_sel):
    print(f"\n{'='*60}")
    print(f"  {name} — POST SUBMIT")
    print('='*60)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=UA, locale="es-CL")
        page = await ctx.new_page()
        try:
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle", timeout=15000)
            await page.fill(input_sel, input_val)
            await page.click(submit_sel)
            await page.wait_for_load_state("networkidle", timeout=20000)
            body_text = await page.evaluate("document.body.innerText")
            html = await page.content()
            print(f"\n[BODY TEXT POST-SUBMIT (1500 chars)]:\n{body_text[:1500]}")
            print(f"\n[HTML POST-SUBMIT (2000 chars)]:\n{html[:2000]}")
        except Exception as e:
            print(f"  ERROR: {e}")
        finally:
            await browser.close()

async def main():
    print(f"\nDiagnóstico para patente: {PATENTE}")
    await dump_site("autoseguro.gob.cl", "https://autoseguro.gob.cl/")
    await dump_site("prt.cl", "https://www.prt.cl/")
    await dump_site("pasastesintag.cl", "https://pasastesintag.cl/")

asyncio.run(main())
