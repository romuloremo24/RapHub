# Audios — Project Log

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
