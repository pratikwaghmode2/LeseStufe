from typing import List, Dict, Any

class PlacementAgent:
    def get_diagnostic_questions(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": 1,
                "target_level": "A1",
                "question": "Choose the correct missing word: 'Ich _____ aus Deutschland.'",
                "options": ["komme", "kommst", "kommen", "kommt"],
                "correct_index": 0,
                "concept": "Basic verb conjugation (1st person singular Präsens)"
            },
            {
                "id": 2,
                "target_level": "A1",
                "question": "What is the correct German article for 'Buch' (book)?",
                "options": ["der", "die", "das", "den"],
                "correct_index": 2,
                "concept": "Noun grammatical gender (das Buch)"
            },
            {
                "id": 3,
                "target_level": "A2",
                "question": "Complete the sentence: 'Gestern _____ ich mit dem Zug nach München gefahren.'",
                "options": ["habe", "bin", "hatte", "werde"],
                "correct_index": 1,
                "concept": "Perfekt tense with motion verb (sein + gefahren)"
            },
            {
                "id": 4,
                "target_level": "A2",
                "question": "Which sentence correctly uses a separable verb?",
                "options": [
                    "Ich aufstehe um sieben Uhr.",
                    "Ich stehe um sieben Uhr auf.",
                    "Ich stehe auf um sieben Uhr.",
                    "Aufstehe ich um sieben Uhr."
                ],
                "correct_index": 1,
                "concept": "Separable verb bracket (Klammerform: stehe ... auf)"
            },
            {
                "id": 5,
                "target_level": "B1",
                "question": "Choose the correct preposition: 'Er wartet schon seit einer Stunde _____ den Bus.'",
                "options": ["an", "für", "auf", "mit"],
                "correct_index": 2,
                "concept": "Verb preposition governance (warten auf + Akkusativ)"
            },
            {
                "id": 6,
                "target_level": "B1",
                "question": "Complete the clause: 'Ich gehe heute früher schlafen, weil ich sehr müde _____.'",
                "options": ["bin", "war", "habe", "werde"],
                "correct_index": 0,
                "concept": "Subordinate clause word order ('weil' sends conjugated verb to the end)"
            },
            {
                "id": 7,
                "target_level": "B2",
                "question": "Which word best completes: 'Die Minister führen schwierige _____ über den Vertrag.'",
                "options": ["Verhandlungen", "Einladungen", "Entdeckungen", "Voraussetzungen"],
                "correct_index": 0,
                "concept": "B2 professional vocabulary (die Verhandlungen = negotiations)"
            }
        ]

    def evaluate_quiz(self, answers: Dict[int, int]) -> Dict[str, Any]:
        questions = self.get_diagnostic_questions()
        score_by_level = {"A1": 0, "A2": 0, "B1": 0, "B2": 0}
        total_by_level = {"A1": 0, "A2": 0, "B1": 0, "B2": 0}

        for q in questions:
            qid = q["id"]
            lvl = q["target_level"]
            total_by_level[lvl] += 1
            if qid in answers and answers[qid] == q["correct_index"]:
                score_by_level[lvl] += 1

        # Determine level recommendation
        recommended_level = "A1"
        if score_by_level["A1"] == total_by_level["A1"]:
            recommended_level = "A2"
            if score_by_level["A2"] >= 1:
                recommended_level = "B1"
                if score_by_level["B1"] >= 1 and score_by_level["B2"] >= 1:
                    recommended_level = "B2"

        explanations = {
            "A1": "You have a solid beginner foundation! We will highlight A2+ words to build your everyday vocabulary.",
            "A2": "Great job! You have mastered elementary German. Reading with B1 highlights will help you advance quickly.",
            "B1": "Impressive! You understand intermediate grammar and sentence structures. We will highlight B2+ advanced vocabulary.",
            "B2": "Excellent fluency! You are ready for authentic German literature and nuanced texts."
        }

        return {
            "recommended_level": recommended_level,
            "score_by_level": score_by_level,
            "total_by_level": total_by_level,
            "feedback": explanations.get(recommended_level, "")
        }

placement_agent = PlacementAgent()
