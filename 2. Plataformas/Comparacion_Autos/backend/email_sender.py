"""Email alerts via SMTP – configure via .env."""
from __future__ import annotations
import asyncio, os, smtplib, logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")


async def send_alert_email(to_email: str, alert_name: str, new_cars: list, app_url: str = "http://localhost:8000"):
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP_USER/SMTP_PASS no configurados – email omitido")
        return

    count = len(new_cars)
    cars_rows = ""
    for c in new_cars[:15]:
        price = f"${c['price']:,.0f}" if c.get("price") else "–"
        year  = str(c.get("year") or "–")
        km    = f"{c['km']:,} km" if c.get("km") else "–"
        title = c.get("title", "Auto")
        url   = c.get("url", "#")
        src   = c.get("source", "")
        cars_rows += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">
            <a href="{url}" style="color:#2563eb;font-weight:600;text-decoration:none">{title}</a>
            <span style="display:block;font-size:.72rem;color:#94a3b8;margin-top:2px">{src}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#059669;white-space:nowrap">{price}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap">{year} · {km}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%);padding:28px 24px;color:#fff">
      <div style="font-size:1.5rem;font-weight:800;margin-bottom:4px">📡 RadarAuto</div>
      <div style="opacity:.85">Alerta: <strong>{alert_name}</strong></div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px;color:#475569">
        Se encontraron <strong style="color:#0f172a">{count} auto{'s' if count != 1 else ''} nuevo{'s' if count != 1 else ''}</strong>
        que coinciden con tu alerta.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:.875rem">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px;text-align:left;color:#64748b;font-weight:600;font-size:.75rem;text-transform:uppercase">Auto</th>
            <th style="padding:8px;text-align:left;color:#64748b;font-weight:600;font-size:.75rem;text-transform:uppercase">Precio</th>
            <th style="padding:8px;text-align:left;color:#64748b;font-weight:600;font-size:.75rem;text-transform:uppercase">Año / Km</th>
          </tr>
        </thead>
        <tbody>{cars_rows}</tbody>
      </table>
      <div style="margin-top:24px">
        <a href="{app_url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:.9rem">
          Ver en RadarAuto →
        </a>
      </div>
    </div>
    <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:.75rem;color:#94a3b8">
      Recibiste este correo porque tienes una alerta activa en RadarAuto.
    </div>
  </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"RadarAuto: {count} auto{'s' if count != 1 else ''} nuevo{'s' if count != 1 else ''} – {alert_name}"
    msg["From"]    = f"RadarAuto <{SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    raw = msg.as_string()

    def _send():
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as srv:
            srv.starttls()
            srv.login(SMTP_USER, SMTP_PASS)
            srv.sendmail(SMTP_USER, to_email, raw)

    try:
        await asyncio.to_thread(_send)
        logger.info("Alert email sent to %s (%d cars)", to_email, count)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
