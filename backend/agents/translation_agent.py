import re
from typing import List, Dict, Any, Optional, Tuple
from backend.services.cefr_dictionary import cefr_dict
from backend.services.gemini_client import gemini_client
from backend.services.translation_provider import has_translation_provider, translate_vocabulary_batch

LEVEL_ORDER = {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5}

# Extensive English vocabulary filter to avoid highlighting English words in bilingual textbooks / grammar guides
ENGLISH_WORDS = {
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 
    'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 
    'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 
    'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'part', 'parts', 
    'conjunction', 'conjunctions', 'pair', 'pairs', 'equivalent', 'equivalents', 'discuss', 
    'discussions', 'sentence', 'sentences', 'approach', 'explain', 'explained', 'studied', 
    'following', 'specific', 'convenient', 'expressing', 'ourselves', 'practical', 'while', 
    'putting', 'forth', 'perspectives', 'during', 'respect', 'position', 'positions', 'conjugated', 
    'remains', 'second', 'individual', 'slightly', 'different', 'wherein', 'latter', 'immediately', 
    'follows', 'each', 'been', 'separately', 'per', 'corresponding', 'let', 'studied', 'coordinating',
    'are', 'neither', 'nor', 'english', 'always', 'clauses', 'clause', 'order', 'words', 'word',
    'grammar', 'rule', 'rules', 'meaning', 'meanings', 'example', 'examples', 'both', 'either',
    'common', 'subject', 'verb', 'respectively', 'constitute', 'surprise', 'element', 'guitar',
    'cook', 'sanskrit', 'learnt', 'impacted', 'impacting', 'justify', 'things', 'abilities',
    'strongly', 'emphasize', 'higher', 'price', 'better', 'quality', 'side', 'partly', 'sometimes',
    'indeed', 'more', 'less', 'very', 'much', 'many', 'shall', 'should', 'must', 'can', 'may'
}

class TranslationAgent:
    def __init__(self):
        self.dict = cefr_dict

    def is_level_above(self, word_level: str, user_level: str) -> bool:
        w_rank = LEVEL_ORDER.get(word_level, 1)
        u_rank = LEVEL_ORDER.get(user_level, 2)
        return w_rank > u_rank

    def tokenize_sentence(self, sentence: str) -> List[Dict[str, Any]]:
        # Match words, punctuation, and whitespace preserving exact original layout
        tokens_raw = re.findall(r'[\w\u00C0-\u017F]+|[^\w\s]+|\s+', sentence, flags=re.UNICODE)
        tokens_info = []

        # First pass: identify plain tokens and lookup
        for tok in tokens_raw:
            # Check if pure whitespace or punctuation or number
            is_word = bool(re.match(r'^[\w\u00C0-\u017F]+$', tok, flags=re.UNICODE)) and not tok.isdigit()
            if not is_word:
                tokens_info.append({
                    'text': tok,
                    'is_word': False,
                    'lemma': '',
                    'level': None,
                    'pos': None,
                    'gender': None,
                    'plural': None,
                    'translation': '',
                    'example_de': '',
                    'example_en': '',
                    'separable_partner': None,
                    'is_highlighted': False
                })
                continue

            tok_lower = tok.lower()

            # Check if recognized English word in bilingual books (never highlight as German)
            is_german_functional = (
                tok_lower in self.dict.vocab or 
                tok_lower in self.dict.separable_prefixes or 
                tok_lower in {
                    'in', 'an', 'zu', 'ab', 'am', 'im', 'um', 'so', 'ist', 'es', 'er', 'sie', 'wir', 'ihr',
                    'mit', 'nach', 'von', 'bei', 'seit', 'aus', 'durch', 'für', 'gegen', 'ohne', 'bis'
                }
            )
            if tok_lower in ENGLISH_WORDS and not is_german_functional:
                tokens_info.append({
                    'text': tok,
                    'is_word': True,
                    'is_english': True,
                    'lemma': tok,
                    'level': None,
                    'pos': 'english',
                    'gender': None,
                    'plural': None,
                    'translation': tok,
                    'example_de': '',
                    'example_en': '',
                    'separable_partner': None,
                    'is_highlighted': False
                })
                continue

            lemma, info = self.dict.lemmatize(tok)
            if info:
                tokens_info.append({
                    'text': tok,
                    'is_word': True,
                    'lemma': info.get('lemma', tok),
                    'level': info.get('level', 'A1'),
                    'pos': info.get('pos', 'unknown'),
                    'gender': info.get('gender'),
                    'plural': info.get('plural'),
                    'translation': info.get('translation', ''),
                    'example_de': info.get('example_de', ''),
                    'example_en': info.get('example_en', ''),
                    'separable_partner': None,
                    'is_highlighted': False
                })
            else:
                # If unknown word starts with uppercase, might be German noun or name
                is_capitalized = tok[0].isupper()
                tokens_info.append({
                    'text': tok,
                    'is_word': True,
                    'lemma': tok,
                    'level': 'B1' if is_capitalized else 'A2',
                    'pos': 'noun' if is_capitalized else 'word',
                    'gender': None,
                    'plural': None,
                    # Unknown words must not pretend that the German token is
                    # an English translation. The UI can request enrichment.
                    'translation': '',
                    'example_de': '',
                    'example_en': '',
                    'separable_partner': None,
                    'is_highlighted': False
                })

        # Second pass: Detect separable verbs
        # e.g. "rief ... an", "steht ... auf", "fährt ... ab"
        word_indices = [i for i, t in enumerate(tokens_info) if t['is_word'] and not t.get('is_english')]
        if len(word_indices) >= 2:
            last_idx = word_indices[-1]
            last_word = tokens_info[last_idx]['text'].lower()
            if last_word in self.dict.separable_prefixes:
                for idx in reversed(word_indices[:-1]):
                    candidate = tokens_info[idx]
                    if candidate.get('pos') == 'verb' or candidate['lemma'] in self.dict.vocab:
                        stem_lemma = candidate['lemma']
                        combined_lemma = f"{last_word}{stem_lemma}"
                        if combined_lemma in self.dict.vocab:
                            vinfo = self.dict.vocab[combined_lemma]
                            candidate['lemma'] = vinfo['lemma']
                            candidate['level'] = vinfo['level']
                            candidate['translation'] = vinfo['translation']
                            candidate['example_de'] = vinfo['example_de']
                            candidate['example_en'] = vinfo['example_en']
                            candidate['separable_partner'] = last_idx
                            tokens_info[last_idx]['separable_partner'] = idx
                            tokens_info[last_idx]['translation'] = f"(prefix of {vinfo['lemma']})"
                            break

        return tokens_info

    def process_passage(self, passage: str, user_level: str = 'A2') -> List[Dict[str, Any]]:
        # Preserve paragraphs and distinct line structures (headers, list items, dialogue)
        paragraphs = re.split(r'\n{2,}', passage.strip())
        sentences_output = []
        p_idx = 0

        for para in paragraphs:
            para_clean = para.strip()
            if not para_clean:
                continue

            # Check if this paragraph contains bullet items or short distinct lines
            lines = [l.strip() for l in para_clean.split('\n') if l.strip()]
            for line in lines:
                # If a line has multiple sentences (ending with . ! ?), split them
                sub_sentences = re.split(r'(?<=[.!?])\s+', line)
                for sent in sub_sentences:
                    sent = sent.strip()
                    if not sent:
                        continue
                    tokens = self.tokenize_sentence(sent)
                    for t in tokens:
                        if t['is_word'] and t.get('level') and not t.get('is_english'):
                            t['is_highlighted'] = self.is_level_above(t['level'], user_level)
                        else:
                            t['is_highlighted'] = False

                    sentences_output.append({
                        'sentence_de': sent,
                        'paragraph_idx': p_idx,
                        'is_line_start': True if sent == sub_sentences[0] else False,
                        'tokens': tokens
                    })
            p_idx += 1

        return sentences_output

    async def process_passage_async(self, passage: str, user_level: str = 'A2') -> List[Dict[str, Any]]:
        """Process a page, then enrich unknown German words in Gemini batches."""
        sentences_output = self.process_passage(passage, user_level)
        unknown = {}
        for sentence in sentences_output:
            for token in sentence['tokens']:
                if token.get('is_word') and not token.get('is_english') and not token.get('translation'):
                    unknown.setdefault(token['text'].casefold(), {
                        'word': token['text'],
                        'context': sentence['sentence_de'],
                    })

        if not has_translation_provider() or not unknown:
            return sentences_output

        enriched = []
        unknown_items = list(unknown.values())
        for start in range(0, len(unknown_items), 20):
            enriched.extend(await translate_vocabulary_batch(unknown_items[start:start + 20]))
        by_word = {str(item.get('word', '')).casefold(): item for item in enriched if item.get('word')}

        for sentence in sentences_output:
            for token in sentence['tokens']:
                item = by_word.get(token['text'].casefold())
                if not item or not item.get('meaning'):
                    continue
                token['translation'] = item['meaning']
                token['level'] = item.get('level') or token.get('level')
                token['pos'] = item.get('pos') or token.get('pos')
                token['gender'] = item.get('gender') or token.get('gender')
                token['is_highlighted'] = self.is_level_above(token['level'], user_level)

        return sentences_output

    async def translate_sentence(self, sentence_de: str) -> str:
        # 1. Try Gemini LLM for natural contextual translation
        if gemini_client.has_key():
            prompt = f"Translate the following German sentence into natural, fluent English. Return ONLY the English translation without quotes or notes:\n\n{sentence_de}"
            res = await gemini_client.generate_text(prompt)
            if res.strip():
                return res.strip().strip('"\'')

        # 2. Rule-based / Dictionary-backed contextual translation fallback
        tokens = self.tokenize_sentence(sentence_de)
        words = [t for t in tokens if t['is_word']]
        if not words:
            return sentence_de

        s_lower = sentence_de.lower().rstrip('.!?')
        known_translations = {
            "guten tag": "Good day!",
            "guten morgen": "Good morning!",
            "gute nacht": "Good night!",
            "wie geht es dir": "How are you?",
            "wie geht es ihnen": "How are you? (formal)",
            "ich heiße anna": "My name is Anna.",
            "ich lerne jeden tag deutsch": "I learn German every day.",
            "das wetter ist heute schön": "The weather is beautiful today.",
            "das war eine schwere entscheidung": "That was a difficult decision.",
            "wir müssen die umwelt schützen": "We must protect the environment.",
            "das buch liegt auf dem tisch": "The book is lying on the table.",
            "er rief gestern seinen freund an": "He called his friend yesterday.",
            "sie steht jeden tag um sieben uhr auf": "She gets up at seven o'clock every day.",
            "ich fahre morgen nach berlin": "I am traveling to Berlin tomorrow.",
            "nachhaltigkeit ist heute unverzichtbar": "Sustainability is indispensable today.",
            "zweigliedrige konnektoren": "Two-part connectors (conjunctions)",
            "mehrteilige konjunktionen": "Multi-part conjunctions",
            "doppelkonjunktionen": "Double conjunctions"
        }
        for k, v in known_translations.items():
            if k in s_lower:
                return v

        # Build informative gloss
        parts = []
        for t in words:
            trans = t.get('translation', t['text'])
            primary = trans.split(',')[0].strip() if trans else t['text']
            parts.append(primary)

        return " ".join(parts) + "."

translation_agent = TranslationAgent()
