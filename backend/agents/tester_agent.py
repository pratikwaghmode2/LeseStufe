from typing import List, Dict, Any
from backend.services.cefr_dictionary import cefr_dict
from backend.agents.translation_agent import translation_agent
from backend.agents.grammar_agent import grammar_agent
from backend.services.db import record_test_run
from backend.agents.developer_agent import developer_agent
from backend.agents.ui_agent import ui_agent

class TesterAgent:
    def run_all_tests(self) -> List[Dict[str, Any]]:
        results = []

        # Test 1: Separable Verbs Detection
        test1_sentence = "Er rief gestern nach langer Pause seinen Freund an."
        tokens1 = translation_agent.tokenize_sentence(test1_sentence)
        verb_token = next((t for t in tokens1 if t['text'] == 'rief'), None)
        passed1 = verb_token is not None and verb_token.get('lemma') == 'anrufen'
        details1 = f"Sentence: '{test1_sentence}' -> Lemma resolved: {verb_token.get('lemma') if verb_token else 'None'}"
        results.append({
            "name": "Separable Verb Resolution ('anrufen')",
            "category": "Linguistics - Syntax",
            "passed": passed1,
            "details": details1
        })
        record_test_run("Separable Verb Resolution", "Linguistics", passed1, details1)

        # Test 2: Compound Noun Decomposition
        test2_word = "Krankenhaus"
        lemma2, info2 = cefr_dict.lemmatize(test2_word)
        passed2 = info2 is not None and info2.get('gender') == 'das'
        details2 = f"Compound: '{test2_word}' -> Gender: {info2.get('gender') if info2 else 'None'}, Level: {info2.get('level') if info2 else 'None'}"
        results.append({
            "name": "Compound Noun Identification ('Krankenhaus')",
            "category": "Linguistics - Lexicon",
            "passed": passed2,
            "details": details2
        })
        record_test_run("Compound Noun Identification", "Linguistics", passed2, details2)

        # Test 3: Irregular Verb Lemmatization
        test3_forms = [("gingen", "gehen"), ("sprach", "sprechen"), ("wäre", "sein"), ("wusste", "wissen")]
        all_passed3 = True
        errs3 = []
        for inflected, expected in test3_forms:
            lem, _ = cefr_dict.lemmatize(inflected)
            if lem != expected:
                all_passed3 = False
                errs3.append(f"{inflected}->{lem} (expected {expected})")
        details3 = "All irregular forms resolved correctly." if all_passed3 else f"Mismatches: {', '.join(errs3)}"
        results.append({
            "name": "Irregular Verb Conjugation Mapping",
            "category": "Linguistics - Morphology",
            "passed": all_passed3,
            "details": details3
        })
        record_test_run("Irregular Verb Conjugation", "Linguistics", all_passed3, details3)

        # Test 4: CEFR Level Discrimination
        test4_cases = [("Haus", "A1"), ("Urlaub", "A2"), ("Entscheidung", "B1"), ("Herausforderung", "B2"), ("Ambivalenz", "C1")]
        all_passed4 = True
        errs4 = []
        for word, expected_lvl in test4_cases:
            info = cefr_dict.lookup(word)
            if not info or info.get('level') != expected_lvl:
                all_passed4 = False
                actual = info.get('level') if info else 'None'
                errs4.append(f"{word}:{actual} (expected {expected_lvl})")
        details4 = "All reference CEFR levels calibrated accurately." if all_passed4 else f"Deviations: {', '.join(errs4)}"
        results.append({
            "name": "CEFR Level Threshold Calibration (A1-C1)",
            "category": "Pedagogy - CEFR",
            "passed": all_passed4,
            "details": details4
        })
        record_test_run("CEFR Level Calibration", "Pedagogy", all_passed4, details4)

        # Test 5: Level-Based Highlighting Filter Logic
        # If user is A2: A1/A2 words must NOT be highlighted, B1+ MUST be highlighted
        test5_text = "Das Kind hat eine Entscheidung getroffen."
        processed = translation_agent.process_passage(test5_text, user_level='A2')
        p_tokens = processed[0]['tokens']
        kind_tok = next((t for t in p_tokens if t['text'] == 'Kind'), None)
        entscheidung_tok = next((t for t in p_tokens if t['text'] == 'Entscheidung'), None)
        passed5 = (kind_tok and not kind_tok.get('is_highlighted')) and (entscheidung_tok and entscheidung_tok.get('is_highlighted'))
        details5 = f"'Kind' (A1) highlighted: {kind_tok.get('is_highlighted') if kind_tok else 'N/A'}, 'Entscheidung' (B1) highlighted: {entscheidung_tok.get('is_highlighted') if entscheidung_tok else 'N/A'}"
        results.append({
            "name": "User Level Filtering & Highlighting Engine",
            "category": "Core Application Logic",
            "passed": bool(passed5),
            "details": details5
        })
        record_test_run("User Level Highlighting Filter", "Core Engine", bool(passed5), details5)

        # Test 6: Preposition Case Rule Association
        passed6 = ('mit' in grammar_agent.prepositions and grammar_agent.prepositions['mit']['case'] == 'Dativ')
        details6 = "Preposition 'mit' correctly governed by Dative case." if passed6 else "Dative rule missing for 'mit'."
        results.append({
            "name": "Grammar Case Rule Engine ('mit' -> Dativ)",
            "category": "Grammar Engine",
            "passed": passed6,
            "details": details6
        })
        record_test_run("Grammar Case Rule Engine", "Grammar Engine", passed6, details6)

        # Test 7: Vocabulary export agent extracts unique words with English meanings
        test7_text = "Das Kind traf eine wichtige Entscheidung im Krankenhaus."
        exported_words = developer_agent.extract_vocabulary(test7_text, user_level="A1")
        exported_lemmas = {word["lemma"] for word in exported_words}
        passed7 = (
            "Entscheidung" in exported_lemmas
            and "Krankenhaus" in exported_lemmas
            and all(word.get("translation") for word in exported_words)
            and len(exported_words) == len(exported_lemmas)
        )
        details7 = f"Extracted {len(exported_words)} unique above-level words with English meanings."
        results.append({
            "name": "Developer Agent Vocabulary Extraction",
            "category": "Vocabulary Export",
            "passed": passed7,
            "details": details7
        })
        record_test_run("Developer Agent Vocabulary Extraction", "Vocabulary Export", passed7, details7)

        # Test 8: PDF artifact is valid and contains the extracted vocabulary
        pdf_bytes = developer_agent.build_vocabulary_pdf(
            "QA Vocabulary", test7_text, user_level="A2"
        )
        passed8 = pdf_bytes.startswith(b"%PDF") and len(pdf_bytes) > 1000
        details8 = f"Generated PDF artifact: {len(pdf_bytes)} bytes."
        try:
            from pypdf import PdfReader
            from io import BytesIO
            pdf_text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(pdf_bytes)).pages)
            passed8 = passed8 and "Entscheidung" in pdf_text and "decision" in pdf_text.lower()
            details8 += " Text extraction verified for German word and English meaning."
        except Exception as exc:
            passed8 = False
            details8 += f" PDF text verification failed: {exc}"
        results.append({
            "name": "Vocabulary PDF Generation & Content Check",
            "category": "Vocabulary Export",
            "passed": passed8,
            "details": details8
        })
        record_test_run("Vocabulary PDF Generation", "Vocabulary Export", passed8, details8)

        # Test 9: Export must never use a German token as its own English meaning
        test9_text = "Das ist eine wichtige Entscheidung im Krankenhaus. Unbekannteswort."
        safe_words = developer_agent.extract_vocabulary(test9_text, user_level="A1", include_all=True)
        repeated_meanings = [
            word for word in safe_words
            if word["word"].casefold() == str(word["translation"]).casefold()
        ]
        passed9 = bool(safe_words) and not repeated_meanings
        details9 = (
            f"Checked {len(safe_words)} exported entries; no German-as-English placeholders found."
            if passed9
            else "One or more exported entries repeat the German word as its English meaning."
        )
        results.append({
            "name": "Vocabulary Translation Integrity",
            "category": "Vocabulary Export",
            "passed": passed9,
            "details": details9
        })
        record_test_run("Vocabulary Translation Integrity", "Vocabulary Export", passed9, details9)

        # Test 10: Form-only / answer-sheet sources should be detected as empty
        answer_sheet_text = "Antwortbogen Prüfungstraining 1 2 3 4 5 a b c d e"
        empty_words = developer_agent.extract_vocabulary(answer_sheet_text, user_level="A2")
        empty_pdf = developer_agent.build_vocabulary_pdf(
            "Answer Sheet", answer_sheet_text, user_level="A2"
        )
        from io import BytesIO
        from pypdf import PdfReader
        empty_pdf_text = "\n".join(
            page.extract_text() or "" for page in PdfReader(BytesIO(empty_pdf)).pages
        )
        passed10 = not empty_words and "No vocabulary" in empty_pdf_text
        details10 = (
            "Form-only source correctly produced an empty-vocabulary diagnostic."
            if passed10
            else "Form-only source was not correctly identified as lacking vocabulary."
        )
        results.append({
            "name": "Empty Source / Answer Sheet Detection",
            "category": "Vocabulary Export",
            "passed": passed10,
            "details": details10
        })
        record_test_run("Empty Source Detection", "Vocabulary Export", passed10, details10)

        # Test 11: Unknown words are enriched by Gemini when the provider is available
        import asyncio
        from backend.services import gemini_client as gemini_module
        original_has_key = gemini_module.gemini_client.has_key
        original_batch = gemini_module.gemini_client.translate_vocabulary_batch

        async def fake_batch(entries):
            return [{
                "word": "Sonderwort",
                "meaning": "special word",
                "level": "B2",
                "pos": "noun",
                "gender": "das",
            }]

        try:
            gemini_module.gemini_client.has_key = lambda: True
            gemini_module.gemini_client.translate_vocabulary_batch = fake_batch
            enriched = asyncio.run(
                developer_agent.extract_vocabulary_async("Sonderwort im Haus.", "A2")
            )
            enriched_word = next((word for word in enriched if word["word"] == "Sonderwort"), None)
            passed11 = bool(enriched_word and enriched_word["translation"] == "special word" and enriched_word["level"] == "B2")
        except Exception:
            passed11 = False
            enriched_word = None
        finally:
            gemini_module.gemini_client.has_key = original_has_key
            gemini_module.gemini_client.translate_vocabulary_batch = original_batch

        details11 = (
            "Unknown word was translated and CEFR-classified through the Gemini enrichment path."
            if passed11
            else "Gemini enrichment did not return a usable meaning and CEFR level."
        )
        results.append({
            "name": "Unknown Vocabulary Gemini Enrichment",
            "category": "Vocabulary Export",
            "passed": passed11,
            "details": details11
        })
        record_test_run("Gemini Vocabulary Enrichment", "Vocabulary Export", passed11, details11)

        # Test 12: Unknown page words are enriched before the reader renders them
        original_has_key_page = gemini_module.gemini_client.has_key
        original_batch_page = gemini_module.gemini_client.translate_vocabulary_batch

        async def fake_page_batch(entries):
            return [{
                "word": "Meer",
                "meaning": "sea",
                "level": "A1",
                "pos": "noun",
                "gender": "das",
            }]

        try:
            gemini_module.gemini_client.has_key = lambda: True
            gemini_module.gemini_client.translate_vocabulary_batch = fake_page_batch
            page_output = asyncio.run(
                translation_agent.process_passage_async("Das Meer ist blau.", "A2")
            )
            page_token = next(
                (token for sentence in page_output for token in sentence["tokens"]
                 if token["text"] == "Meer"),
                None,
            )
            passed12 = bool(page_token and page_token.get("translation") == "sea")
        except Exception:
            passed12 = False
            page_token = None
        finally:
            gemini_module.gemini_client.has_key = original_has_key_page
            gemini_module.gemini_client.translate_vocabulary_batch = original_batch_page

        details12 = (
            "Unknown page word was translated before reader vocabulary was returned."
            if passed12
            else "Page-level Gemini enrichment did not populate the unknown word."
        )
        results.append({
            "name": "Reader Page Gemini Enrichment",
            "category": "Reader Translation",
            "passed": passed12,
            "details": details12
        })
        record_test_run("Reader Page Gemini Enrichment", "Reader Translation", passed12, details12)

        # Test 13: DeepL supplies a translation when Gemini is unavailable
        from backend.services import deepl_client as deepl_module
        original_gemini_key_deepl = gemini_module.gemini_client.has_key
        original_deepl_key = deepl_module.deepl_client.has_key
        original_deepl_batch = deepl_module.deepl_client.translate_vocabulary_batch

        async def fake_deepl_batch(entries):
            return [{
                "word": "Riegel",
                "meaning": "latch",
                "level": "B1",
                "pos": "word",
                "gender": None,
            }]

        try:
            gemini_module.gemini_client.has_key = lambda: False
            deepl_module.deepl_client.has_key = lambda: True
            deepl_module.deepl_client.translate_vocabulary_batch = fake_deepl_batch
            page_output = asyncio.run(
                translation_agent.process_passage_async("Der Riegel ist geschlossen.", "A2")
            )
            page_token = next(
                (token for sentence in page_output for token in sentence["tokens"]
                 if token["text"] == "Riegel"),
                None,
            )
            passed13 = bool(page_token and page_token.get("translation") == "latch")
        except Exception:
            passed13 = False
            page_token = None
        finally:
            gemini_module.gemini_client.has_key = original_gemini_key_deepl
            deepl_module.deepl_client.has_key = original_deepl_key
            deepl_module.deepl_client.translate_vocabulary_batch = original_deepl_batch

        details13 = (
            "DeepL fallback translated an unknown page word when Gemini was unavailable."
            if passed13
            else "DeepL fallback did not populate the unknown page word."
        )
        results.append({
            "name": "DeepL Translation Fallback",
            "category": "Reader Translation",
            "passed": passed13,
            "details": details13
        })
        record_test_run("DeepL Translation Fallback", "Reader Translation", passed13, details13)

        # Test 14: UI agent scores the reader experience and returns actionable feedback
        ui_audit = ui_agent.audit()
        passed14 = ui_audit["score"] >= 75 and len(ui_audit["checks"]) >= 5
        recommendation_count = len(ui_audit.get("recommendations", []))
        details14 = (
            f"UI/UX score: {ui_audit['score']}/{ui_audit['max_score']} ({ui_audit['grade']}); "
            f"reviewed {ui_audit['files_reviewed']} frontend files; {recommendation_count} recommendations."
        )
        results.append({
            "name": "UI Agent Experience Score",
            "category": "Frontend UX",
            "passed": passed14,
            "details": details14
        })
        record_test_run("UI Agent Experience Score", "Frontend UX", passed14, details14)

        return results

tester_agent = TesterAgent()
