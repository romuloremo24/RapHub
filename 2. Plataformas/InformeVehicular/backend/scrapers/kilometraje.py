"""
Registros de Kilometraje — sin fuente pública disponible.
Los datos provienen de concesionarias, talleres y revisiones técnicas.
"""


async def check_kilometraje(patente: str) -> dict:
    return {
        "status": "unavailable",
        "message": "No existe base de datos pública de kilometraje en Chile. "
                   "Los registros provienen de concesionarias y talleres autorizados.",
        "fuente": "Concesionarias / talleres — datos privados",
        "hint": "Puedes solicitar historial de mantenciones directamente al concesionario de la marca.",
    }
