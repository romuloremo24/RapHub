import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

load_dotenv(Path(__file__).parent.parent.parent / "0. Config" / ".env")

TRANSCRIPCIONES = Path(__file__).parent / "Transcripciones"

INSTRUCCION = """Tenés el siguiente fragmento de una transcripción. Es una conversación entre DOS personas:
- ENTREVISTADORA: hace preguntas cortas, dice "ah ya", "¿cachai?", "sí", guía la conversación.
- NACHA: narra su historia de forma extensa.

Tu tarea:
1. Separar los turnos de habla e identificar quién habla en cada momento
2. Usar el formato exacto (sin asteriscos ni markdown, solo texto plano):
   NACHA: [lo que dice]
   ENTREVISTADORA: [lo que dice]
3. Cada turno en su propio párrafo, separado por línea en blanco
4. NO cambies ninguna palabra, solo organizá el texto
5. Si hay fragmentos ininteligibles, ponelos entre [corchetes]

FRAGMENTO:
"""

def formatear_chunk(client: Groq, chunk: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": INSTRUCCION + chunk}],
        temperature=0.1,
        max_tokens=6000,
    )
    return response.choices[0].message.content

def cortar_en_oracion(texto: str, pos: int, margen: int = 800) -> int:
    corte = texto.rfind(". ", max(0, pos - margen), pos + margen)
    return corte + 2 if corte != -1 else pos

def dividir_en_partes(texto: str, n: int) -> list[str]:
    largo = len(texto)
    partes = []
    inicio = 0
    for i in range(1, n):
        objetivo = largo * i // n
        fin = cortar_en_oracion(texto, objetivo)
        partes.append(texto[inicio:fin].strip())
        inicio = fin
    partes.append(texto[inicio:].strip())
    return partes

def formatear(archivo: Path) -> str:
    texto = archivo.read_text(encoding="utf-8")
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    partes = dividir_en_partes(texto, 4)

    resultado = "PARTICIPANTES: 2 personas\n  - NACHA: narra su historia\n  - ENTREVISTADORA: hace preguntas y acompaña\n\n" + ("─" * 60) + "\n\n"

    for i, parte in enumerate(partes, 1):
        print(f"  Procesando parte {i}/4 ({len(parte)} chars)...")
        resultado += formatear_chunk(client, parte) + "\n\n"

    return resultado.strip()

def main():
    archivos = list(TRANSCRIPCIONES.glob("*.txt"))
    archivos = [a for a in archivos if not a.stem.endswith("_formateado")]

    for archivo in archivos:
        print(f"Formateando: {archivo.name} ...")
        resultado = formatear(archivo)
        salida = archivo.parent / (archivo.stem + "_formateado.txt")
        salida.write_text(resultado, encoding="utf-8")
        print(f"  -> {salida}")

if __name__ == "__main__":
    main()
