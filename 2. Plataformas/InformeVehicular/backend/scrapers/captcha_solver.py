import os
import asyncio
import httpx


async def solve_recaptcha_v2(site_key: str, page_url: str) -> str | None:
    api_key = os.getenv("CAPSOLVER_API_KEY", "")
    if not api_key:
        return None
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post("https://api.capsolver.com/createTask", json={
            "clientKey": api_key,
            "task": {
                "type": "ReCaptchaV2TaskProxyless",
                "websiteURL": page_url,
                "websiteKey": site_key,
            },
        })
        d = r.json()
        if d.get("errorId") != 0:
            return None
        task_id = d["taskId"]
        for _ in range(40):
            await asyncio.sleep(3)
            r2 = await client.post("https://api.capsolver.com/getTaskResult", json={
                "clientKey": api_key,
                "taskId": task_id,
            })
            res = r2.json()
            if res.get("status") == "ready":
                return res["solution"]["gRecaptchaResponse"]
            if res.get("errorId") != 0:
                return None
    return None
