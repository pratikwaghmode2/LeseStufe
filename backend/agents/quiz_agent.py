import random
from typing import List, Dict, Any
from backend.services.db import get_saved_vocab
from backend.services.gemini_client import gemini_client

class QuizAgent:
    async def generate_cloze_quiz(self, user_level: str = 'A2', count: int = 5) -> List[Dict[str, Any]]:
        saved = get_saved_vocab()
        questions = []

        if gemini_client.has_key() and len(saved) >= 2:
            words_str = ", ".join([f"{w['word']} ({w['translation']})" for w in saved[:10]])
            prompt = f"""Generate {count} multiple-choice fill-in-the-blank (cloze) questions in German for an {user_level} learner.
Use some of these saved target words if possible: {words_str}.

Return a JSON array with this exact structure:
[
  {{
    "sentence_with_blank": "Ich muss morgen früh __________.",
    "correct_answer": "aufstehen",
    "options": ["aufstehen", "aufgeben", "einkaufen", "mitkommen"],
    "english_hint": "get up",
    "explanation": "'aufstehen' means to get up in the morning."
  }}
]
Return ONLY the JSON array."""
            res = await gemini_client.generate_text(prompt, json_mode=True)
            if res:
                try:
                    import json
                    clean = res.strip()
                    if clean.startswith("```json"):
                        clean = clean[7:].rstrip("`").strip()
                    return json.loads(clean)
                except Exception:
                    pass

        # High-quality offline fallback quiz questions
        bank = [
            {
                "sentence_with_blank": "Das war eine wirklich schwere __________.",
                "correct_answer": "Entscheidung",
                "options": ["Entscheidung", "Erfahrung", "Gesundheit", "Einladung"],
                "english_hint": "decision",
                "explanation": "'die Entscheidung' (B1) means choice or decision."
            },
            {
                "sentence_with_blank": "Er __________ gestern seinen alten Freund an.",
                "correct_answer": "rief",
                "options": ["rief", "ging", "sprach", "nahm"],
                "english_hint": "called (separable: anrufen)",
                "explanation": "'anrufen' is a separable verb: 'Er rief ... an'."
            },
            {
                "sentence_with_blank": "Wir müssen die __________ für zukünftige Generationen schützen.",
                "correct_answer": "Umwelt",
                "options": ["Umwelt", "Gesellschaft", "Wohnung", "Kleidung"],
                "english_hint": "environment",
                "explanation": "'die Umwelt' (B1) means environment."
            },
            {
                "sentence_with_blank": "Ich lade dich herzlich zu meinem __________ ein.",
                "correct_answer": "Geburtstag",
                "options": ["Geburtstag", "Bahnhof", "Wetter", "Schuh"],
                "english_hint": "birthday",
                "explanation": "'der Geburtstag' means birthday."
            },
            {
                "sentence_with_blank": "Können Sie mir bitte den Weg zum __________ erklären?",
                "correct_answer": "Bahnhof",
                "options": ["Bahnhof", "Kaffee", "Schnee", "Urlaub"],
                "english_hint": "train station",
                "explanation": "'der Bahnhof' is the train station."
            },
            {
                "sentence_with_blank": "Das neue Projekt ist eine große __________ für das Team.",
                "correct_answer": "Herausforderung",
                "options": ["Herausforderung", "Geschwindigkeit", "Verhandlung", "Erkenntnis"],
                "english_hint": "challenge (B2)",
                "explanation": "'die Herausforderung' means challenge."
            }
        ]
        random.shuffle(bank)
        return bank[:count]

quiz_agent = QuizAgent()
