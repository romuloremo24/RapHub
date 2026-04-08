import os
from pathlib import Path

from dotenv import load_dotenv

# Carga el .env central de 1. Config/, con fallback al .env local
_central = Path(__file__).parents[3] / "1. Config" / ".env"
_local = Path(__file__).parents[1] / ".env"

if _central.exists():
    load_dotenv(_central)
if _local.exists():
    load_dotenv(_local, override=True)  # local tiene prioridad si existe

# Telegram
TELEGRAM_BOT_TOKEN: str = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID: int = int(os.environ["TELEGRAM_CHAT_ID"])
ALLOWED_USER_IDS: set[int] = {
    int(uid.strip())
    for uid in os.environ.get("ALLOWED_USER_IDS", "").split(",")
    if uid.strip().isdigit()
}

# LLM
LLM_PROVIDER: str = os.environ.get("LLM_PROVIDER", "gemini")
GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")

# Model names
GEMINI_MODEL: str = "gemini-2.5-flash"
ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"
GROQ_MODEL: str = "llama-3.3-70b-versatile"

# API base URLs
GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

# Scraping
TARGET_URL: str = os.environ.get("TARGET_URL", "")
SCRAPE_INTERVAL_MINUTES: int = int(os.environ.get("SCRAPE_INTERVAL_MINUTES", "60"))

# App
LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
DB_PATH: str = os.environ.get("DB_PATH", "data/conversations.db")
MAX_HISTORY_MESSAGES: int = 50
