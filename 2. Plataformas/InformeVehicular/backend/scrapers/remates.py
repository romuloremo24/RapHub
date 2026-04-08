"""
Remates / Pérdida Total — base de datos CASER (privada).
No existe consulta pública gratuita. Retorna stub informativo.
"""


async def check_remates(patente: str) -> dict:
    return {
        "status": "unavailable",
        "message": "Base de datos CASER (Cámara de Aseguradores) es privada. "
                   "Disponible solo en servicios de pago como Autofact o Checkcar.",
        "direct_url": "https://www.autofact.cl/",
        "fuente": "CASER — requiere contrato comercial",
    }
