import httpx
import json
import os

from app.core.config import settings

async def summarize_with_gemini(prompt: str) -> str:
    url = (
    "https://generativelanguage.googleapis.com/v1/models/"
    "gemini-2.5-flash:generateContent"
    f"?key={settings.GEMINI_API_KEY}"
)





    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.post(
            url,
            json={
                "contents": [
                    {"parts": [{"text": prompt}]}
                ]
            }
        )

        data = response.json()

        if response.status_code != 200:
            detail = data.get("error") or data.get("message") or data
            raise RuntimeError(
                f"Gemini API error {response.status_code}: {json.dumps(detail)}"
            )

        if "candidates" in data and data["candidates"]:
            candidate = data["candidates"][0]
            content = candidate.get("content", {})
            parts = content.get("parts", [])
            if parts and isinstance(parts, list) and "text" in parts[0]:
                return parts[0]["text"]

        if "output" in data:
            output = data["output"]
            if isinstance(output, dict):
                candidates = output.get("candidates") or output.get("items")
                if candidates and isinstance(candidates, list):
                    candidate = candidates[0]
                    content = candidate.get("content", {})
                    parts = content.get("parts", [])
                    if parts and isinstance(parts, list) and "text" in parts[0]:
                        return parts[0]["text"]
                text = output.get("text")
                if isinstance(text, str):
                    return text

        raise RuntimeError(
            f"Unexpected Gemini response shape: {json.dumps(data)}"
        )
