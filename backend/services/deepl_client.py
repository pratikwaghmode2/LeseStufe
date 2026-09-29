import os
from typing import Any, Dict, List, Optional

import httpx


class DeepLClient:
    """Small DeepL adapter used when Gemini cannot provide a word meaning."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("DEEPL_API_KEY", "")
        self.base_url = "https://api-free.deepl.com/v2/translate"

    def has_key(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5)

    async def translate_vocabulary_batch(self, entries: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        if not self.has_key() or not entries:
            return []

        payload = {
            "text": [entry["word"] for entry in entries],
            "source_lang": "DE",
            "target_lang": "EN-US",
        }
        headers = {
            "Authorization": f"DeepL-Auth-Key {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
                if response.status_code != 200:
                    return []
                translations = response.json().get("translations", [])
        except Exception:
            return []

        results = []
        for entry, translation in zip(entries, translations):
            meaning = str(translation.get("text", "")).strip()
            if meaning and meaning.casefold() != entry["word"].casefold():
                results.append({
                    "word": entry["word"],
                    "meaning": meaning,
                    # DeepL translates but does not classify CEFR levels.
                    "level": "B1",
                    "pos": "word",
                    "gender": None,
                })
        return results


deepl_client = DeepLClient()
