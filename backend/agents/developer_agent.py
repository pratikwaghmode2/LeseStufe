from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from xml.sax.saxutils import escape

from backend.services.cefr_dictionary import cefr_dict
from backend.agents.translation_agent import LEVEL_ORDER, translation_agent
from backend.services.gemini_client import gemini_client


class DeveloperAgent:
    """Builds learner-facing vocabulary artifacts from the reading pipeline."""

    def extract_vocabulary(
        self, text: str, user_level: str = "A2", include_all: bool = False
    ) -> List[Dict[str, Any]]:
        vocabulary: Dict[str, Dict[str, Any]] = {}

        for sentence in translation_agent.process_passage(text, user_level):
            for token in sentence["tokens"]:
                if not token.get("is_word") or token.get("is_english"):
                    continue
                if not include_all and not token.get("is_highlighted"):
                    continue

                # The reader assigns the original token as a fallback for unknown
                # words. Never present that placeholder as an English meaning.
                dictionary_info = cefr_dict.lookup(token.get("lemma") or token["text"])
                if not dictionary_info or dictionary_info.get("compound_head"):
                    continue
                translation = str(dictionary_info.get("translation") or "").strip()
                if not translation or translation.casefold() == token["text"].casefold():
                    continue

                lemma = token.get("lemma") or token["text"]
                key = lemma.lower()
                if key not in vocabulary:
                    vocabulary[key] = {
                        "word": token["text"],
                        "lemma": lemma,
                        "level": token.get("level") or "A1",
                        "pos": token.get("pos") or "word",
                        "gender": token.get("gender"),
                        "translation": translation,
                        "context_sentence": sentence["sentence_de"],
                    }

        level_order = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5}
        return sorted(
            vocabulary.values(),
            key=lambda item: (level_order.get(item["level"], 9), item["lemma"].lower()),
        )

    async def extract_vocabulary_async(
        self, text: str, user_level: str = "A2", include_all: bool = False
    ) -> List[Dict[str, Any]]:
        """Include unknown words by enriching them with Gemini in small batches."""
        vocabulary = {item["lemma"].casefold(): item for item in self.extract_vocabulary(text, user_level, include_all)}
        unknown: Dict[str, Dict[str, str]] = {}

        for sentence in translation_agent.process_passage(text, user_level):
            for token in sentence["tokens"]:
                if not token.get("is_word") or token.get("is_english"):
                    continue
                dictionary_info = cefr_dict.lookup(token.get("lemma") or token["text"])
                if dictionary_info and not dictionary_info.get("compound_head"):
                    continue
                key = token["text"].casefold()
                unknown.setdefault(key, {"word": token["text"], "context": sentence["sentence_de"]})

        if gemini_client.has_key():
            unknown_items = list(unknown.values())
            for start in range(0, len(unknown_items), 20):
                enriched = await gemini_client.translate_vocabulary_batch(unknown_items[start:start + 20])
                for item in enriched:
                    word = str(item.get("word") or "").strip()
                    meaning = str(item.get("meaning") or "").strip()
                    level = str(item.get("level") or "").upper()
                    if not word or not meaning or meaning.casefold() == word.casefold() or level not in LEVEL_ORDER:
                        continue
                    if not include_all and LEVEL_ORDER[level] <= LEVEL_ORDER.get(user_level, 2):
                        continue
                    source = unknown.get(word.casefold(), {})
                    vocabulary[word.casefold()] = {
                        "word": word,
                        "lemma": word,
                        "level": level,
                        "pos": item.get("pos") or "word",
                        "gender": item.get("gender"),
                        "translation": meaning,
                        "context_sentence": source.get("context", ""),
                    }

        level_order = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5}
        return sorted(vocabulary.values(), key=lambda item: (level_order.get(item["level"], 9), item["lemma"].lower()))

    @staticmethod
    def _register_font() -> str:
        font_name = "LeseStufeUnicode"
        if font_name in pdfmetrics.getRegisteredFontNames():
            return font_name

        candidates = [
            Path("C:/Windows/Fonts/arial.ttf"),
            Path("C:/Windows/Fonts/segoeui.ttf"),
        ]
        font_path = next((path for path in candidates if path.exists()), None)
        if font_path:
            pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
            return font_name
        return "Helvetica"

    def _render_vocabulary_pdf(
        self,
        title: str,
        user_level: str = "A2",
        words: List[Dict[str, Any]] = None,
    ) -> bytes:
        words = words or []
        font_name = self._register_font()
        output = BytesIO()
        document = SimpleDocTemplate(
            output,
            pagesize=A4,
            rightMargin=16 * mm,
            leftMargin=16 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
            title=f"{title} Vocabulary",
            author="LeseStufe AI",
        )
        styles = getSampleStyleSheet()
        styles.add(
            ParagraphStyle(
                name="VocabularyTitle",
                parent=styles["Title"],
                fontName=font_name,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#172033"),
                spaceAfter=6 * mm,
            )
        )
        styles.add(
            ParagraphStyle(
                name="SmallUnicode",
                parent=styles["BodyText"],
                fontName=font_name,
                fontSize=8.5,
                leading=11,
            )
        )
        styles.add(
            ParagraphStyle(
                name="MetaUnicode",
                parent=styles["BodyText"],
                fontName=font_name,
                fontSize=9,
                leading=12,
                textColor=colors.HexColor("#526070"),
            )
        )

        story = [
            Paragraph("LeseStufe AI Vocabulary", styles["VocabularyTitle"]),
            Paragraph(
                f"{escape(title)} | Learner level: {escape(user_level)} | {len(words)} words",
                styles["MetaUnicode"],
            ),
            Spacer(1, 5 * mm),
        ]

        rows = [
            [
                Paragraph("German", styles["SmallUnicode"]),
                Paragraph("English meaning", styles["SmallUnicode"]),
                Paragraph("Level", styles["SmallUnicode"]),
                Paragraph("Context", styles["SmallUnicode"]),
            ]
        ]
        for item in words:
            german = f"{item['gender'] + ' ' if item.get('gender') else ''}{item['word']}"
            rows.append(
                [
                    Paragraph(escape(german), styles["SmallUnicode"]),
                    Paragraph(escape(str(item["translation"])), styles["SmallUnicode"]),
                    Paragraph(escape(item["level"]), styles["SmallUnicode"]),
                    Paragraph(escape(item["context_sentence"]), styles["SmallUnicode"]),
                ]
            )

        if not words:
            rows.append(
                [
                    Paragraph("No vocabulary matched this learner level.", styles["SmallUnicode"]),
                    "",
                    "",
                    "",
                ]
            )

        table = Table(rows, colWidths=[32 * mm, 43 * mm, 18 * mm, 82 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2b84b")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#172033")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(table)
        document.build(story)
        return output.getvalue()

    def build_vocabulary_pdf(
        self, title: str, text: str, user_level: str = "A2", include_all: bool = False
    ) -> bytes:
        return self._render_vocabulary_pdf(
            title, user_level, self.extract_vocabulary(text, user_level, include_all)
        )

    async def build_vocabulary_pdf_async(
        self, title: str, text: str, user_level: str = "A2", include_all: bool = False
    ) -> bytes:
        words = await self.extract_vocabulary_async(text, user_level, include_all)
        return self._render_vocabulary_pdf(title, user_level, words)


developer_agent = DeveloperAgent()
