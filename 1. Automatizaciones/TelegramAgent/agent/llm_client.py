import json
from typing import Protocol, runtime_checkable

from utils.retry import async_retry


@runtime_checkable
class LLMClient(Protocol):
    async def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system: str | None = None,
    ) -> tuple[str | None, list[dict] | None]:
        """
        Send messages and return a response.

        Returns:
            (text, None)       — plain text response
            (None, tool_calls) — tool use requested

        tool_calls format: [{"id": str, "name": str, "arguments": dict}]
        """
        ...


class OpenAICompatibleClient:
    """Handles Gemini (via OpenAI-compatible endpoint) and Groq."""

    def __init__(self, api_key: str, base_url: str, model: str) -> None:
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._model = model

    @async_retry(max_attempts=3, base_delay=2.0)
    async def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system: str | None = None,
    ) -> tuple[str | None, list[dict] | None]:
        msgs: list[dict] = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.extend(messages)

        kwargs: dict = {"model": self._model, "messages": msgs}
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        response = await self._client.chat.completions.create(**kwargs)
        message = response.choices[0].message

        if message.tool_calls:
            return None, [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments),
                }
                for tc in message.tool_calls
            ]

        return message.content or "", None


class AnthropicClient:
    """Handles Claude models via the Anthropic SDK."""

    def __init__(self, api_key: str, model: str) -> None:
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    @async_retry(max_attempts=3, base_delay=2.0)
    async def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system: str | None = None,
    ) -> tuple[str | None, list[dict] | None]:
        anthropic_tools = None
        if tools:
            anthropic_tools = [
                {
                    "name": t["function"]["name"],
                    "description": t["function"].get("description", ""),
                    "input_schema": t["function"]["parameters"],
                }
                for t in tools
            ]

        kwargs: dict = {
            "model": self._model,
            "max_tokens": 4096,
            "messages": _to_anthropic_messages(messages),
        }
        if system:
            kwargs["system"] = system
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = await self._client.messages.create(**kwargs)

        if response.stop_reason == "tool_use":
            return None, [
                {
                    "id": block.id,
                    "name": block.name,
                    "arguments": block.input,
                }
                for block in response.content
                if block.type == "tool_use"
            ]

        text = "".join(
            block.text for block in response.content if block.type == "text"
        )
        return text, None


def _to_anthropic_messages(messages: list[dict]) -> list[dict]:
    """Convert OpenAI-format messages to Anthropic format."""
    result: list[dict] = []
    i = 0
    while i < len(messages):
        msg = messages[i]
        role = msg["role"]

        if role == "user":
            result.append({"role": "user", "content": msg["content"]})

        elif role == "assistant":
            if msg.get("tool_calls"):
                content: list[dict] = []
                if msg.get("content"):
                    content.append({"type": "text", "text": msg["content"]})
                for tc in msg["tool_calls"]:
                    content.append(
                        {
                            "type": "tool_use",
                            "id": tc["id"],
                            "name": tc["function"]["name"],
                            "input": json.loads(tc["function"]["arguments"]),
                        }
                    )
                result.append({"role": "assistant", "content": content})
            else:
                result.append({"role": "assistant", "content": msg["content"] or ""})

        elif role == "tool":
            # Group consecutive tool results into one user message
            tool_results: list[dict] = []
            while i < len(messages) and messages[i]["role"] == "tool":
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": messages[i]["tool_call_id"],
                        "content": messages[i]["content"],
                    }
                )
                i += 1
            result.append({"role": "user", "content": tool_results})
            continue

        i += 1

    return result


def create_llm_client(provider: str) -> LLMClient:
    from config import settings

    if provider == "gemini":
        return OpenAICompatibleClient(
            api_key=settings.GEMINI_API_KEY,
            base_url=settings.GEMINI_BASE_URL,
            model=settings.GEMINI_MODEL,
        )
    if provider == "anthropic":
        return AnthropicClient(
            api_key=settings.ANTHROPIC_API_KEY,
            model=settings.ANTHROPIC_MODEL,
        )
    if provider == "groq":
        return OpenAICompatibleClient(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
            model=settings.GROQ_MODEL,
        )
    raise ValueError(f"Unknown LLM provider: {provider!r}. Choose: gemini | anthropic | groq")
