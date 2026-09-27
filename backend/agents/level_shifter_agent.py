from typing import Dict, Any, Optional
from backend.services.gemini_client import gemini_client

class LevelShifterAgent:
    async def simplify_passage(self, text_de: str, target_level: str = 'A2') -> Dict[str, Any]:
        target_level = target_level.upper()
        if target_level not in ['A1', 'A2', 'B1']:
            target_level = 'A2'

        # 1. Use Gemini for dynamic AI simplification
        if gemini_client.has_key():
            prompt = (
                f"You are an expert German graded reader author.\n"
                f"Rewrite the following German passage into clean, natural {target_level} German for a language learner.\n"
                f"Rules:\n"
                f"1. Retain the exact narrative story, plot points, and character names.\n"
                f"2. Use {target_level} level vocabulary and simpler sentence structures (fewer nested relative clauses).\n"
                f"3. Do NOT translate to English. Output only the simplified German text.\n\n"
                f"Original Passage:\n{text_de}\n\n"
                f"Simplified {target_level} German:"
            )
            res = await gemini_client.generate_text(prompt)
            if res.strip():
                return {
                    "target_level": target_level,
                    "original_text": text_de,
                    "simplified_text": res.strip(),
                    "changes_summary": f"Adapted vocabulary and complex clauses into {target_level} structures."
                }

        # 2. Rule-based fallback simplification
        replacements = {
            "Herausforderung": "schwere Aufgabe",
            "Nachhaltigkeit": "Umweltschutz",
            "Voraussetzung": "Bedingung",
            "Entscheidung treffen": "entscheiden",
            "in Betracht ziehen": "überlegen",
            "zur Verfügung stehen": "da sein",
            "kontinuierlich": "immer",
            "unverzichtbar": "sehr wichtig",
            "bemerkenswert": "toll",
            "beurteilen": "ansehen und verstehen",
            "bewältigen": "schaffen",
            "allerdings": "aber",
            "deshalb": "deswegen"
        }
        simplified = text_de
        for orig, simp in replacements.items():
            simplified = simplified.replace(orig, simp)
            simplified = simplified.replace(orig.lower(), simp.lower())

        return {
            "target_level": target_level,
            "original_text": text_de,
            "simplified_text": simplified,
            "changes_summary": f"Simplified formal idioms and complex vocabulary into clear {target_level} phrasing."
        }

level_shifter_agent = LevelShifterAgent()
