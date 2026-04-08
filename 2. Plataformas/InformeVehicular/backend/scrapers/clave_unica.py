import os
from playwright.async_api import Page


async def do_login(page: Page, timeout: int = 20000) -> bool:
    rut  = os.getenv("CLAVE_UNICA_RUT", "")
    pswd = os.getenv("CLAVE_UNICA_PASS", "")
    if not rut or not pswd:
        return False

    # Wait for redirect to Clave Única auth page
    try:
        await page.wait_for_url(
            lambda url: any(x in url for x in ["claveunica", "cuentaunica", "sso.registrocivil"]),
            timeout=timeout,
        )
    except Exception:
        # Check if we're already on a login page
        current = page.url
        if not any(x in current for x in ["claveunica", "cuentaunica", "login", "auth"]):
            return False

    rut_clean = rut.replace(".", "")

    for sel in ["#rut", "input[name='rut']", "#username", "input[name='username']", "#j_username"]:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                await el.fill(rut_clean)
                break
        except Exception:
            pass

    await page.wait_for_timeout(400)

    for sel in ["#password", "input[type='password']", "input[name='password']", "#j_password"]:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                await el.fill(pswd)
                break
        except Exception:
            pass

    await page.wait_for_timeout(300)

    for sel in ["button[type='submit']", "input[type='submit']", ".btn-primary", "#btnSubmit", ".boton-cu", "button.btn"]:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                await el.click()
                break
        except Exception:
            pass

    # Wait for redirect away from login page — success = URL is no longer claveunica
    try:
        await page.wait_for_url(
            lambda url: not any(x in url for x in ["claveunica", "cuentaunica", "sso.registrocivil"]),
            timeout=25000,
        )
        return True
    except Exception:
        current = page.url
        return not any(x in current for x in ["claveunica", "cuentaunica", "sso.registrocivil"])
