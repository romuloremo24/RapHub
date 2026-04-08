import os

import aiosqlite

from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class ConversationMemory:
    def __init__(self, db_path: str = settings.DB_PATH) -> None:
        self._db_path = db_path
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    async def initialize(self) -> None:
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id      INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    role    TEXT    NOT NULL,
                    content TEXT    NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_user_id ON conversations(user_id)"
            )
            await db.commit()
        logger.info(f"Memory initialized at {self._db_path}")

    async def get_history(self, user_id: int) -> list[dict]:
        async with aiosqlite.connect(self._db_path) as db:
            async with db.execute(
                """
                SELECT role, content FROM (
                    SELECT id, role, content FROM conversations
                    WHERE user_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                ) ORDER BY id ASC
                """,
                (user_id, settings.MAX_HISTORY_MESSAGES),
            ) as cursor:
                rows = await cursor.fetchall()
        return [{"role": row[0], "content": row[1]} for row in rows]

    async def append_messages(self, user_id: int, messages: list[dict]) -> None:
        async with aiosqlite.connect(self._db_path) as db:
            await db.executemany(
                "INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)",
                [(user_id, m["role"], m["content"]) for m in messages],
            )
            # Prune rows beyond MAX_HISTORY_MESSAGES
            await db.execute(
                """
                DELETE FROM conversations
                WHERE user_id = ? AND id NOT IN (
                    SELECT id FROM conversations
                    WHERE user_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                )
                """,
                (user_id, user_id, settings.MAX_HISTORY_MESSAGES),
            )
            await db.commit()

    async def clear_history(self, user_id: int) -> None:
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute(
                "DELETE FROM conversations WHERE user_id = ?", (user_id,)
            )
            await db.commit()
        logger.info(f"History cleared for user {user_id}")
