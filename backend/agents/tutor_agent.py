import os
from typing import Dict, Any, List
from backend.services.gemini_client import gemini_client

class TutorAgent:
    async def chat(self, user_message: str, current_page_text: str, user_level: str = 'A2', history: List[Dict[str, str]] = None) -> str:
        history = history or []

        if gemini_client.has_key():
            system_prompt = (
                f"You are 'LeseTutor', an encouraging and knowledgeable German reading companion.\n"
                f"The learner's current CEFR German level is: {user_level}.\n"
                f"The text from the book page they are currently reading is:\n"
                f"{current_page_text}\n\n"
                f"Your Guidelines:\n"
                f"1. Help the learner understand the German text, explain difficult words, cultural references, or sentence structures.\n"
                f"2. Adapt your explanation to their level ({user_level}). Keep explanations clear and concise.\n"
                f"3. If they ask in English, reply in friendly English with German examples in bold.\n"
                f"4. If they ask in German, reply in simple, accessible German."
            )

            prompt = f"Learner's Question: {user_message}"
            res = await gemini_client.generate_text(prompt, system_instruction=system_prompt)
            if res.strip():
                return res.strip()

        # Offline fallback tutor responses
        msg_lower = user_message.lower()
        if "summary" in msg_lower or "zusammenfassung" in msg_lower or "about" in msg_lower:
            words = current_page_text.split()[:30]
            snippet = " ".join(words) + "..."
            return f"This passage discusses the narrative scene: \"{snippet}\". It introduces key vocabulary for {user_level} learners. Would you like me to translate any specific sentence?"
        elif "why" in msg_lower or "warum" in msg_lower:
            return f"In German, sentence structure often changes depending on whether it's a main clause (verb in position 2) or a subordinate clause (verb kicked to the end). Check the highlighted words to see if a preposition or conjunction is driving this form!"
        elif "grammar" in msg_lower or "case" in msg_lower or "dativ" in msg_lower:
            return "Notice the case markers: Dative often indicates location ('Wo?') or an indirect recipient, while Accusative often marks direction ('Wohin?') or the direct object."
        else:
            return f"Great question! On this page, you have vocabulary tuned to {user_level}. Click on any highlighted word to inspect its translation, or toggle 'Gloss Mode' on the top bar to see inline English subtitles as you read!"

tutor_agent = TutorAgent()
