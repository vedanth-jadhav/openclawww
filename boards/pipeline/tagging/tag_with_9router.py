#!/usr/bin/env python3
"""9Router client skeleton for classification, clustering, and solution drafts."""

from __future__ import annotations

import os
from typing import Any

import requests


def ninerouter_headers() -> dict[str, str]:
    headers = {"content-type": "application/json"}
    key = os.getenv("NINEROUTER_KEY")
    if key:
        headers["authorization"] = f"Bearer {key}"
    return headers


def list_models() -> list[dict[str, Any]]:
    base_url = os.environ["NINEROUTER_URL"].rstrip("/")
    response = requests.get(f"{base_url}/v1/models", headers=ninerouter_headers(), timeout=30)
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", payload)


def chat(messages: list[dict[str, str]], model: str | None = None) -> str:
    base_url = os.environ["NINEROUTER_URL"].rstrip("/")
    response = requests.post(
        f"{base_url}/v1/chat/completions",
        headers=ninerouter_headers(),
        json={"model": model or os.getenv("NINEROUTER_MODEL", "auto"), "messages": messages},
        timeout=90,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["choices"][0]["message"]["content"]
