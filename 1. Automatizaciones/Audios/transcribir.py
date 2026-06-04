import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / "0. Config" / ".env")

from groq import Groq

ARCHIVOS_DIR = Path(__file__).parent / "Archivos"
SALIDA_DIR = Path(__file__).parent / "Transcripciones"
SALIDA_DIR.mkdir(exist_ok=True)

def transcribir(archivo: Path) -> str:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    with open(archivo, "rb") as f:
        result = client.audio.transcriptions.create(
            file=f,
            model="whisper-large-v3",
            language="es",
            response_format="text",
            prompt="Conversación en español chileno. Mantener modismos, coloquialismos y palabras tal cual se dicen.",
        )
    return result

def main():
    archivos = sys.argv[1:]
    if archivos:
        targets = [Path(a) for a in archivos]
    else:
        targets = list(ARCHIVOS_DIR.glob("*.mp4")) + list(ARCHIVOS_DIR.glob("*.mp3")) + list(ARCHIVOS_DIR.glob("*.m4a"))

    if not targets:
        print("No se encontraron archivos de audio.")
        return

    for archivo in targets:
        print(f"Transcribiendo: {archivo.name} ...")
        texto = transcribir(archivo)
        salida = SALIDA_DIR / (archivo.stem + ".txt")
        salida.write_text(texto, encoding="utf-8")
        print(f"  -> Guardado en: {salida}")
        print(f"\n--- TRANSCRIPCIÓN ---\n{texto}\n")

if __name__ == "__main__":
    main()
