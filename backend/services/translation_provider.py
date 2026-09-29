from typing import Any, Dict, List

from backend.services.deepl_client import deepl_client
from backend.services.gemini_client import gemini_client


async def translate_vocabulary_batch(entries: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Use Gemini when available, then DeepL as a translation-only fallback."""
    if gemini_client.has_key():
        result = await gemini_client.translate_vocabulary_batch(entries)
        if result:
            return result
    return await deepl_client.translate_vocabulary_batch(entries)


def has_translation_provider() -> bool:
    return gemini_client.has_key() or deepl_client.has_key()
