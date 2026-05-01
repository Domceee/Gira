import httpx
import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def summarize_with_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            json={
                "contents": [
                    {"parts": [{"text": prompt}]}
                ]
            }
        )

        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
