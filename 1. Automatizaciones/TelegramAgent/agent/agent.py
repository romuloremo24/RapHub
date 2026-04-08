import json

from agent.llm_client import LLMClient
from agent.memory import ConversationMemory
from utils.logger import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are a helpful AI assistant with access to web scraping tools.
You can fetch and analyze content from URLs when needed to answer questions or monitor changes.

Available tools:
- scrape_url(url): Fetch and extract text content from any public URL

Be concise and helpful. Respond in the same language as the user."""

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "scrape_url",
            "description": (
                "Fetch and extract the text content from a URL. "
                "Use this to retrieve current information from web pages."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to fetch and parse",
                    }
                },
                "required": ["url"],
            },
        },
    }
]

MAX_TOOL_ITERATIONS = 8


class Agent:
    """
    Stateless agent that does not know about Telegram.
    Receives a plain string, returns a plain string.
    """

    def __init__(
        self,
        llm: LLMClient,
        memory: ConversationMemory,
        tools: dict,
    ) -> None:
        self._llm = llm
        self._memory = memory
        self._tools = tools  # name -> async callable

    async def run(self, user_id: int, user_message: str) -> str:
        history = await self._memory.get_history(user_id)
        working = history + [{"role": "user", "content": user_message}]

        text: str | None = None

        for iteration in range(MAX_TOOL_ITERATIONS):
            text, tool_calls = await self._llm.chat(
                messages=working,
                tools=TOOLS_SCHEMA,
                system=SYSTEM_PROMPT,
            )

            if text is not None:
                break

            if not tool_calls:
                text = "I could not generate a response."
                break

            logger.debug(
                f"user={user_id} iteration={iteration + 1} tools={[tc['name'] for tc in tool_calls]}"
            )

            # Append the assistant's tool-call turn (OpenAI format)
            working.append(
                {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": tc["id"],
                            "type": "function",
                            "function": {
                                "name": tc["name"],
                                "arguments": json.dumps(tc["arguments"]),
                            },
                        }
                        for tc in tool_calls
                    ],
                }
            )

            # Execute each tool and append results
            for tc in tool_calls:
                tool_fn = self._tools.get(tc["name"])
                if tool_fn is None:
                    result = f"Error: unknown tool '{tc['name']}'"
                    logger.error(result)
                else:
                    try:
                        result = await tool_fn(**tc["arguments"])
                    except Exception as e:
                        result = f"Tool '{tc['name']}' failed: {e}"
                        logger.error(f"Tool {tc['name']} failed for user {user_id}: {e}")

                working.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": str(result)[:8000],  # guard against huge payloads
                    }
                )
        else:
            text = "Reached maximum tool iterations without a final answer."
            logger.warning(f"user={user_id} hit MAX_TOOL_ITERATIONS={MAX_TOOL_ITERATIONS}")

        final_text = text or ""

        await self._memory.append_messages(
            user_id,
            [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": final_text},
            ],
        )

        return final_text

    async def analyze(self, prompt: str) -> str:
        """One-shot analysis without memory. Used by scheduler jobs."""
        text, _ = await self._llm.chat(
            messages=[{"role": "user", "content": prompt}],
            system=SYSTEM_PROMPT,
        )
        return text or ""
