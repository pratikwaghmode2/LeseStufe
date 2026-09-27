import os
import re
from typing import List, Dict, Any
from backend.services.gemini_client import gemini_client

class BookParser:
    @staticmethod
    def clean_german_text(text: str) -> str:
        # Rejoin hyphenated words split across lines: e.g. "Entschei-\ndung" -> "Entscheidung"
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
        # Normalize carriage returns and spacing
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def extract_from_pdf(file_bytes: bytes) -> str:
        text = ""

        # 1. Try PyMuPDF (fitz) with text, blocks, and words fallback
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                t = page.get_text("text")
                if not t.strip():
                    blocks = page.get_text("blocks")
                    t = "\n".join([b[4] for b in blocks if len(b) > 4 and isinstance(b[4], str)])
                if not t.strip():
                    words = page.get_text("words")
                    t = " ".join([w[4] for w in words if len(w) > 4 and isinstance(w[4], str)])
                text += t + "\n\n"

            cleaned = BookParser.clean_german_text(text)
            if len(cleaned.strip()) >= 20:
                return cleaned
        except Exception:
            pass

        # 2. Try pypdf fallback
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pypdf_text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    pypdf_text += extracted + "\n\n"
            cleaned = BookParser.clean_german_text(pypdf_text)
            if len(cleaned.strip()) >= 20:
                return cleaned
        except Exception:
            pass

        return BookParser.clean_german_text(text)

    @staticmethod
    async def extract_from_pdf_async(file_bytes: bytes) -> str:
        """Extract embedded text first, then OCR image-only pages with Gemini Vision."""
        extracted = BookParser.extract_from_pdf(file_bytes)
        if len(extracted.strip()) >= 20 or not gemini_client.has_key():
            return extracted

        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            ocr_pages: List[str] = []
            for page in doc:
                pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
                page_text = await gemini_client.extract_text_from_image(
                    pixmap.tobytes("png"), "image/png"
                )
                if page_text.strip():
                    ocr_pages.append(page_text)

            return BookParser.clean_german_text("\n\n".join(ocr_pages))
        except Exception:
            return extracted

    @staticmethod
    def paginate_content(text: str, words_per_page: int = 220) -> List[str]:
        cleaned = BookParser.clean_german_text(text)
        paragraphs = cleaned.split('\n\n')
        
        pages: List[str] = []
        current_page_paras: List[str] = []
        current_word_count = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            words_in_para = len(para.split())
            if current_word_count + words_in_para > words_per_page and current_page_paras:
                pages.append('\n\n'.join(current_page_paras))
                current_page_paras = [para]
                current_word_count = words_in_para
            else:
                current_page_paras.append(para)
                current_word_count += words_in_para

        if current_page_paras:
            pages.append('\n\n'.join(current_page_paras))

        return pages if pages else [cleaned]
