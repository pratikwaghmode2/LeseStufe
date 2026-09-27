import os
import json
import base64
from typing import Optional, Dict, Any, List
import httpx

class GeminiClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    def has_key(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5)

    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None, json_mode: bool = False) -> str:
        if not self.has_key():
            return ""

        url = f"{self.base_url}?key={self.api_key}"
        contents = []
        
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "topP": 0.9,
                "maxOutputTokens": 2048
            }
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                return ""
        except Exception:
            return ""

    async def extract_text_from_image(self, image_bytes: bytes, mime_type: str = "image/png") -> str:
        """Use Gemini vision to OCR an image-only document page."""
        if not self.has_key():
            return ""

        url = f"{self.base_url}?key={self.api_key}"
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                "Read this scanned document page. Extract only the visible text, "
                                "preserve German umlauts and ß, keep paragraph breaks, and do not "
                                "describe the image. Return plain text only."
                            )
                        },
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 4096,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception:
            pass
        return ""

    async def translate_vocabulary_batch(self, entries: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Translate and classify unknown vocabulary in one cost-controlled request."""
        if not self.has_key() or not entries:
            return []

        prompt = f"""For each German vocabulary item below, return an English meaning and estimate its CEFR level.
Return ONLY a JSON array with this exact shape:
[{{"word":"...","meaning":"...","level":"A1|A2|B1|B2|C1","pos":"noun|verb|adjective|other","gender":"der|die|das|null"}}]
Do not repeat the German word as the meaning. Use the sentence context when available.

Items:
{json.dumps(entries, ensure_ascii=False)}"""
        result = await self.generate_text(prompt, json_mode=True)
        if not result:
            return []
        try:
            clean = result.strip()
            if clean.startswith("```json"):
                clean = clean[7:].rstrip("`").strip()
            data = json.loads(clean)
            return data if isinstance(data, list) else []
        except Exception:
            return []

gemini_client = GeminiClient()
