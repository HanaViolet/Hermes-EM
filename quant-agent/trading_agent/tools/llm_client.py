"""
LLM Client — OpenAI-compatible API wrapper with graceful fallback.
Set LLM_ENABLE=1 and LLM_API_KEY to activate.
"""
from __future__ import annotations
import json as _json, os, requests as _r
from typing import Any


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None: return default
    return raw.lower() in {"1", "true", "yes", "on"}


def llm_enabled() -> bool:
    return _env_bool("LLM_ENABLE", False) and bool(os.getenv("LLM_API_KEY"))


def call_llm_json(system_prompt: str, user_payload: dict[str, Any], fallback: dict[str, Any], temperature: float = 0.2) -> dict[str, Any]:
    if not llm_enabled():
        return fallback
    api_key = os.getenv("LLM_API_KEY", "")
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")
    body = {"model": model, "temperature": temperature, "response_format": {"type": "json_object"}, "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": _json.dumps(user_payload, ensure_ascii=False)},
    ]}
    try:
        resp = _r.post(f"{base_url}/chat/completions", headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=body, timeout=45)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = _json.loads(content)
        return parsed if isinstance(parsed, dict) else fallback
    except Exception:
        return fallback
