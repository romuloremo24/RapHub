# Audios — Project Log

## 2026-08-03 — App web para usuario no técnico (Streamlit Cloud)

### Implementado

- **[app.py](app.py)**: app Streamlit de 4 pasos (sube audio → marca formatos →
  cuántas personas hablan → descarga). Pensada para alguien que no sabe de
  tecnología: sin jerga, sin consola, un archivo por casilla marcada, `.zip` si
  marca varias. Clave de acceso opcional vía `CLAVE_ACCESO` en secrets.
- **[transcriptor/audio.py](transcriptor/audio.py)**: re-codifica a 16 kHz mono
  MP3 48k (1h23 de audio: 38 MB → 28,5 MB) y corta en trozos de ~10 min. Los
  puntos de corte se eligen en silencios reales (`silencedetect`, ±90 s del
  objetivo) — esto resuelve el bug de solapamiento/duplicación que tenía
  `formatear.py`, sin necesidad de overlap ni dedup.
- **[transcriptor/texto.py](transcriptor/texto.py)**: limpia alucinaciones de
  Whisper en silencios (Amara.org y compañía), filtra el prompt cuando se cuela,
  colapsa segmentos repetidos consecutivos, agrupa en párrafos por pausa >1,6 s y
  genera las marcas de tiempo.
- **[transcriptor/hablantes.py](transcriptor/hablantes.py)**: separación de
  turnos genérica para 1–4 personas con nombres opcionales, en chunks de 3800
  chars, pasando el último turno como contexto al siguiente chunk y fusionando
  cuando el hablante coincide en el borde.
- **[transcriptor/minuta.py](transcriptor/minuta.py)**: resumen map-reduce con
  secciones fijas (resumen, temas, acuerdos, tareas, datos).
- **[transcriptor/exportar.py](transcriptor/exportar.py)**: DOCX y TXT genéricos,
  con portada, colores por hablante de la paleta RaiHub y nota al pie que advierte
  que la atribución de hablantes es estimada.
- Los tres scripts viejos se movieron a `legacy/` — estaban hardcodeados a la
  entrevista de NACHA (reemplazos textuales y consideraciones fijas en el código).

### Verificado

- 1h23 de audio real: 9 trozos de 3,4 MB, cortes en silencios, offsets correctos.
- Tramo de 2,5 min contra la API: 15 segmentos en 3,1 s; turnos en 1,2 s; minuta
  en 1,0 s. Los acentos llegan bien en el JSON (la mutilación de palabras que
  registraba el log anterior era artefacto de consola, no de Whisper).
- `AppTest` sin excepciones; widgets y condicionales OK; boot HTTP 200.

### Pendiente

- Deploy manual en share.streamlit.io (requiere OAuth de GitHub en el navegador).
  Pasos exactos en el [README](README.md).
- Sigue sin haber diarización real de audio: con 3+ voces o habla superpuesta la
  atribución se equivoca.

## 2026-06-04 — Setup inicial: transcripción + diarización + exportación

### Implementado

- **[transcribir.py](transcribir.py)**: transcribe archivos de audio/video (mp4, mp3, m4a, wav, webm) usando Whisper large-v3 vía Groq API. Lee todos los archivos en `Archivos/`, guarda `.txt` en `Transcripciones/`. Carga `GROQ_API_KEY` desde `../../0. Config/.env`.
- **[formatear.py](formatear.py)**: toma la transcripción cruda y usa `llama-3.3-70b-versatile` (Groq) para separar turnos de habla e identificar hablantes (NACHA / ENTREVISTADORA). Procesa en chunks de ~5k chars para no superar el límite TPM (12k tokens/min del tier gratuito).
- **[exportar.py](exportar.py)**: aplica limpieza manual de errores conocidos (artefactos, prompt de Whisper, repeticiones de chunks, errores de atribución), agrega sección de consideraciones técnicas y exporta a TXT + DOCX. Usa `python-docx` con colores por hablante.
- **Flujo completo**: `python transcribir.py` → `python formatear.py` → `python exportar.py`. Outputs finales: `*_final.txt` y `*_final.docx`.

### Pendiente / incompleto

- La diarización automática no es perfecta en segmentos con habla solapada o muy rápida — requiere revisión manual puntual.
- Los chunks en `formatear.py` a veces se solapan levemente en los cortes (una pregunta puede quedar duplicada). Para archivos largos considerar overlap intencional de ~200 chars y dedup posterior.
- No hay diarización de audio real (speaker embeddings) — el LLM infiere hablantes por patrón de habla. Para casos con más de 2 hablantes o voces similares, esto no escala.

### Decisiones técnicas

- **Groq Whisper large-v3** sobre Whisper local: sin setup, sin GPU requerida, gratis en tier gratuito, acepta MP4 directo.
- **Archivos/ y Transcripciones/ en .gitignore**: el contenido puede ser sensible. Los scripts sí se commitean.
- **Chunking en 4 partes** para `formatear.py`: el texto de ~14k tokens superaba el límite TPM de 12k. 4 chunks de ~3.5k chars cada uno funcionan sin errores.

### Próximo paso recomendado

- Probar con un segundo audio para validar que el flujo completo funciona end-to-end sin ajustes.
- Si se necesita diarización real (más de 2 hablantes), evaluar `pyannote-audio` con CUDA o el endpoint de diarización de AssemblyAI.
