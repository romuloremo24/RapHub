from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from bot.handlers.commands import _authorized
from utils.logger import get_logger

logger = get_logger(__name__)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _authorized(update.effective_user.id):
        await update.message.reply_text("Unauthorized.")
        return

    text = (update.message.text or "").strip()
    if not text:
        return

    user_id = update.effective_user.id
    agent = context.bot_data["agent"]

    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id,
        action=ChatAction.TYPING,
    )

    try:
        response = await agent.run(user_id=user_id, user_message=text)
        await update.message.reply_text(response)
    except Exception as e:
        logger.error(f"Agent error for user {user_id}: {e}", exc_info=True)
        await update.message.reply_text("An error occurred. Please try again.")
