import re
from typing import Dict, Any, List, Optional
from backend.services.gemini_client import gemini_client
from backend.services.cefr_dictionary import cefr_dict

class GrammarAgent:
    def __init__(self):
        self.prepositions = {
            # Dative prepositions
            'aus': {'case': 'Dativ', 'rule': 'Always triggers Dative (out of, from)'},
            'außer': {'case': 'Dativ', 'rule': 'Always triggers Dative (except for)'},
            'bei': {'case': 'Dativ', 'rule': 'Always triggers Dative (at, by, with)'},
            'mit': {'case': 'Dativ', 'rule': 'Always triggers Dative (with)'},
            'nach': {'case': 'Dativ', 'rule': 'Always triggers Dative (after, to)'},
            'seit': {'case': 'Dativ', 'rule': 'Always triggers Dative (since, for)'},
            'von': {'case': 'Dativ', 'rule': 'Always triggers Dative (from, of)'},
            'zu': {'case': 'Dativ', 'rule': 'Always triggers Dative (to, at)'},
            'gegenüber': {'case': 'Dativ', 'rule': 'Always triggers Dative (opposite)'},

            # Accusative prepositions
            'durch': {'case': 'Akkusativ', 'rule': 'Always triggers Accusative (through)'},
            'für': {'case': 'Akkusativ', 'rule': 'Always triggers Accusative (for)'},
            'gegen': {'case': 'Akkusativ', 'rule': 'Always triggers Accusative (against)'},
            'ohne': {'case': 'Akkusativ', 'rule': 'Always triggers Accusative (without)'},
            'um': {'case': 'Akkusativ', 'rule': 'Always triggers Accusative (around, at)'},
            'bis': {'case': 'Akkusativ', 'rule': 'Always triggers Accusative (until)'},

            # Two-way prepositions (Wechselpräpositionen)
            'an': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'auf': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'hinter': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'in': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'neben': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'über': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'unter': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'vor': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},
            'zwischen': {'case': 'Dativ / Akkusativ', 'rule': 'Two-way preposition: Dative for position (Wo?), Accusative for direction (Wohin?)'},

            # Genitive prepositions
            'wegen': {'case': 'Genitiv', 'rule': 'Triggers Genitive (because of)'},
            'während': {'case': 'Genitiv', 'rule': 'Triggers Genitive (during)'},
            'trotz': {'case': 'Genitiv', 'rule': 'Triggers Genitive (despite)'},
            'statt': {'case': 'Genitiv', 'rule': 'Triggers Genitive (instead of)'}
        }

        self.articles = {
            'der': {'gender': 'masculine', 'case': 'Nominativ / Genitiv / Dativ (plural/feminine)'},
            'den': {'gender': 'masculine / plural', 'case': 'Akkusativ (masc) / Dativ (plural)'},
            'dem': {'gender': 'masculine / neuter', 'case': 'Dativ'},
            'des': {'gender': 'masculine / neuter', 'case': 'Genitiv'},
            'die': {'gender': 'feminine / plural', 'case': 'Nominativ / Akkusativ'},
            'das': {'gender': 'neuter', 'case': 'Nominativ / Akkusativ'},
            'ein': {'gender': 'masculine / neuter', 'case': 'Nominativ (masc/neut) / Akkusativ (neut)'},
            'einen': {'gender': 'masculine', 'case': 'Akkusativ'},
            'einem': {'gender': 'masculine / neuter', 'case': 'Dativ'},
            'einer': {'gender': 'feminine', 'case': 'Dativ / Genitiv'},
            'eines': {'gender': 'masculine / neuter', 'case': 'Genitiv'},
            'eine': {'gender': 'feminine', 'case': 'Nominativ / Akkusativ'}
        }

    async def analyze_sentence(self, sentence_de: str) -> Dict[str, Any]:
        # 1. Use Gemini if available for in-depth German grammar breakdown
        if gemini_client.has_key():
            prompt = f"""You are an expert German grammar tutor. Analyze this sentence for an A2/B1 learner.
Sentence: "{sentence_de}"

Return a JSON object with:
{{
  "main_clause": "Brief description of sentence structure",
  "tense": "Identified tense (e.g. Präsens, Präteritum, Perfekt)",
  "case_breakdowns": [
    {{"phrase": "auf dem Tisch", "case": "Dativ", "reason": "Wechselpräposition 'auf' answering 'Wo?' (location)"}}
  ],
  "grammar_tips": "1-2 practical tips for a German learner regarding word order or endings"
}}
Return ONLY the JSON."""
            res = await gemini_client.generate_text(prompt, json_mode=True)
            if res:
                try:
                    import json
                    clean_res = res.strip()
                    if clean_res.startswith("```json"):
                        clean_res = clean_res[7:].rstrip("`").strip()
                    return json.loads(clean_res)
                except Exception:
                    pass

        # 2. Rule-based grammar inspection
        words = re.findall(r'\w+', sentence_de, flags=re.UNICODE)
        case_breakdowns = []
        tense = "Präsens (Present)"
        
        # Check for past tense indicators
        past_markers = ['war', 'hatte', 'ging', 'fuhr', 'kam', 'wurde', 'konnte', 'musste', 'wollte', 'sah', 'sprach', 'stellte', 'machte']
        for w in words:
            if w.lower() in past_markers:
                tense = "Präteritum (Simple Past)"
                break
            if w.lower() in ['hat', 'ist', 'haben', 'sind'] and any(x.lower().startswith('ge') for x in words):
                tense = "Perfekt (Conversational Past)"
                break

        # Check prepositions and governed cases
        for i, w in enumerate(words):
            low = w.lower()
            if low in self.prepositions:
                prep_info = self.prepositions[low]
                # Look ahead for article / noun
                phrase_tokens = [w]
                if i + 1 < len(words):
                    phrase_tokens.append(words[i+1])
                if i + 2 < len(words):
                    phrase_tokens.append(words[i+2])
                case_breakdowns.append({
                    "phrase": " ".join(phrase_tokens),
                    "case": prep_info['case'],
                    "reason": prep_info['rule']
                })

        return {
            "main_clause": "Standard German S-V-O or Subordinate structure",
            "tense": tense,
            "case_breakdowns": case_breakdowns,
            "grammar_tips": "Remember: The finite verb always occupies position 2 in a German main clause!"
        }

grammar_agent = GrammarAgent()
