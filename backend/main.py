import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.services.db import (
    init_db, get_user_settings, update_user_settings,
    save_book, get_books, get_book,
    save_word, get_saved_vocab, delete_saved_word, update_word_progress,
    get_test_runs
)
from backend.services.book_parser import BookParser
from backend.services.gemini_client import gemini_client
from backend.services.translation_provider import translate_vocabulary_batch
from backend.services.cefr_dictionary import cefr_dict
from backend.agents.translation_agent import translation_agent
from backend.agents.grammar_agent import grammar_agent
from backend.agents.level_shifter_agent import level_shifter_agent
from backend.agents.tutor_agent import tutor_agent
from backend.agents.quiz_agent import quiz_agent
from backend.agents.placement_agent import placement_agent
from backend.agents.tester_agent import tester_agent
from backend.agents.developer_agent import developer_agent
from backend.agents.ui_agent import ui_agent
from backend.data.sample_books import SAMPLE_BOOKS

app = FastAPI(
    title="LeseStufe AI - Agentic German Graded Reader",
    description="Level-based German reader, translation, and vocabulary assistant with specialized language agents.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()
    # Restore a key saved through the settings endpoint after a server restart.
    saved_settings = get_user_settings()
    saved_key = (saved_settings.get("gemini_api_key") or "").strip()
    if saved_key:
        gemini_client.api_key = saved_key
    # Pre-seed sample books if none exist
    existing = get_books()
    if not existing:
        for b in SAMPLE_BOOKS:
            save_book(b["title"], b["author"], b["content"], b.get("level", "A2"))

# --- SETTINGS ENDPOINTS ---
class SettingsPayload(BaseModel):
    user_level: Optional[str] = None
    grammar_mode: Optional[bool] = None
    gloss_mode: Optional[bool] = None
    reading_theme: Optional[str] = None
    font_size: Optional[int] = None
    gemini_api_key: Optional[str] = None

@app.get("/api/settings")
def read_settings():
    return get_user_settings()

@app.post("/api/settings")
def update_settings(payload: SettingsPayload):
    data = payload.dict(exclude_none=True)
    if 'gemini_api_key' in data:
        gemini_client.api_key = data['gemini_api_key']
    update_user_settings(data)
    return get_user_settings()

# --- BOOKS ENDPOINTS ---
@app.get("/api/books")
def list_books():
    return get_books()

@app.get("/api/books/{book_id}")
def read_book(book_id: int):
    book = get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Paginate content
    pages = BookParser.paginate_content(book["content"], words_per_page=220)
    book["pages"] = pages
    book["total_pages"] = len(pages)
    return book

@app.get("/api/books/{book_id}/vocabulary.pdf")
async def download_vocabulary_pdf(book_id: int, user_level: str = "A2", include_all: bool = False):
    book = get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    clean_level = user_level.upper()
    if clean_level not in ["A1", "A2", "B1", "B2", "C1"]:
        clean_level = "A2"

    pdf_bytes = await developer_agent.build_vocabulary_pdf_async(
        title=book["title"],
        text=book["content"],
        user_level=clean_level,
        include_all=include_all,
    )
    filename = "".join(char if char.isalnum() or char in "-_" else "_" for char in book["title"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}_vocabulary.pdf"'},
    )

@app.post("/api/books/upload")
async def upload_book(
    title: Optional[str] = Form(None),
    author: Optional[str] = Form("Unknown"),
    level: Optional[str] = Form("A2"),
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None)
):
    content = ""
    filename = ""
    if file:
        filename = file.filename or ""
        content_bytes = await file.read()
        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            content = await BookParser.extract_from_pdf_async(content_bytes)
        else:
            try:
                content = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = content_bytes.decode("latin-1", errors="ignore")
    elif raw_text:
        content = raw_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Please select a file or enter text.")

    if not content or len(content.strip()) < 10:
        raise HTTPException(
            status_code=400, 
            detail="No readable text could be extracted from this PDF. Scanned PDFs are supported when a Gemini API key is configured; otherwise use the 'Paste Text' tab or upload a text-based PDF."
        )

    # Auto-generate title if omitted
    clean_title = (title or "").strip()
    if not clean_title:
        if filename:
            clean_title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ")
        else:
            clean_title = "German Text Document"

    clean_author = (author or "").strip() or "Unknown"
    clean_level = (level or "A2").strip().upper()
    if clean_level not in ["A1", "A2", "B1", "B2", "C1"]:
        clean_level = "A2"

    book_id = save_book(clean_title, clean_author, content, clean_level)
    return {"id": book_id, "title": clean_title, "message": "Book uploaded successfully"}

# --- READER & TRANSLATION ENGINE ---
class ProcessPagePayload(BaseModel):
    page_text: str
    user_level: str = "A2"

@app.post("/api/process-page")
async def process_page(payload: ProcessPagePayload):
    sentences = await translation_agent.process_passage_async(payload.page_text, payload.user_level)
    
    # Calculate page vocabulary summary above user level
    unique_words = {}
    for sent in sentences:
        for t in sent['tokens']:
            if t['is_word'] and t.get('is_highlighted'):
                lemma = t.get('lemma') or t['text']
                translation = (t.get('translation') or '').strip()
                if not translation or translation.casefold() == t['text'].casefold() or '(compound:' in translation or '(prefix of' in translation:
                    continue
                if lemma not in unique_words:
                    unique_words[lemma] = {
                        'text': t['text'],
                        'lemma': lemma,
                        'level': t.get('level', 'B1'),
                        'translation': translation,
                        'gender': t.get('gender')
                    }

    vocab_summary = list(unique_words.values())
    vocab_summary.sort(key=lambda x: x.get('level', 'A1'))

    return {
        "sentences": sentences,
        "vocab_summary": vocab_summary
    }

class SentenceTranslationPayload(BaseModel):
    sentence_de: str

@app.post("/api/translate-sentence")
async def translate_sentence_endpoint(payload: SentenceTranslationPayload):
    translation = await translation_agent.translate_sentence(payload.sentence_de)
    return {"sentence_de": payload.sentence_de, "translation_en": translation}

class WordTranslationPayload(BaseModel):
    word: str
    context_sentence: str = ""

@app.post("/api/translate-word")
async def translate_word_endpoint(payload: WordTranslationPayload):
    word = payload.word.strip()
    if not word:
        return {"word": "", "translation": ""}

    known = cefr_dict.lookup(word)
    if known and known.get("translation") and not known.get("compound_head"):
        return {
            "word": word,
            "translation": known["translation"],
            "level": known.get("level"),
            "pos": known.get("pos"),
            "gender": known.get("gender"),
        }

    enriched = await translate_vocabulary_batch([{
        "word": word,
        "context": payload.context_sentence,
    }])
    if enriched:
        item = enriched[0]
        return {
            "word": word,
            "translation": item.get("meaning", ""),
            "level": item.get("level"),
            "pos": item.get("pos"),
            "gender": item.get("gender"),
        }
    return {"word": word, "translation": ""}

# --- GRAMMAR AGENT (TRIGGERED WHEN GRAMMAR MODE IS ON) ---
class GrammarPayload(BaseModel):
    sentence_de: str

@app.post("/api/grammar-analysis")
async def grammar_analysis(payload: GrammarPayload):
    analysis = await grammar_agent.analyze_sentence(payload.sentence_de)
    return analysis

# --- LEVEL SHIFTER AGENT ---
class SimplifyPayload(BaseModel):
    text_de: str
    target_level: str = "A2"

@app.post("/api/simplify")
async def simplify_passage(payload: SimplifyPayload):
    result = await level_shifter_agent.simplify_passage(payload.text_de, payload.target_level)
    return result

# --- TUTOR AGENT ---
class TutorChatPayload(BaseModel):
    message: str
    page_text: str
    user_level: str = "A2"
    history: List[Dict[str, str]] = []

@app.post("/api/tutor-chat")
async def tutor_chat(payload: TutorChatPayload):
    reply = await tutor_agent.chat(payload.message, payload.page_text, payload.user_level, payload.history)
    return {"reply": reply}

# --- SAVED VOCABULARY & FLASHCARDS ---
class SaveWordPayload(BaseModel):
    word: str
    lemma: str
    level: str = "B1"
    pos: Optional[str] = "noun"
    gender: Optional[str] = None
    translation: str
    context_sentence: Optional[str] = ""

@app.post("/api/vocab")
def add_vocab(payload: SaveWordPayload):
    new_id = save_word(
        word=payload.word,
        lemma=payload.lemma,
        level=payload.level,
        pos=payload.pos or "word",
        gender=payload.gender,
        translation=payload.translation,
        context_sentence=payload.context_sentence or ""
    )
    return {"id": new_id, "message": "Word saved to flashcards"}

@app.get("/api/vocab")
def list_vocab(level: Optional[str] = None):
    return get_saved_vocab(level)

@app.delete("/api/vocab/{word_id}")
def remove_vocab(word_id: int):
    delete_saved_word(word_id)
    return {"success": True}

class ReviewPayload(BaseModel):
    mastered: bool

@app.post("/api/vocab/{word_id}/review")
def review_vocab(word_id: int, payload: ReviewPayload):
    update_word_progress(word_id, payload.mastered)
    return {"success": True}

@app.get("/api/quiz")
async def get_quiz(user_level: str = "A2", count: int = 5):
    return await quiz_agent.generate_cloze_quiz(user_level, count)

# --- PLACEMENT DIAGNOSTIC AGENT ---
@app.get("/api/placement/questions")
def get_placement_questions():
    return placement_agent.get_diagnostic_questions()

class PlacementAnswersPayload(BaseModel):
    answers: Dict[int, int]

@app.post("/api/placement/evaluate")
def evaluate_placement(payload: PlacementAnswersPayload):
    result = placement_agent.evaluate_quiz(payload.answers)
    # Automatically update user setting
    update_user_settings({"user_level": result["recommended_level"]})
    return result

# --- QA & TESTER AGENT ---
@app.get("/api/test/run")
def run_qa_tests():
    results = tester_agent.run_all_tests()
    passed_count = sum(1 for r in results if r["passed"])
    return {
        "total": len(results),
        "passed": passed_count,
        "failed": len(results) - passed_count,
        "results": results
    }

@app.get("/api/test/history")
def test_history():
    return get_test_runs()

@app.get("/api/test/ui-score")
def ui_score():
    return ui_agent.audit()

# --- STATIC FRONTEND SERVING ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response

dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(dist_dir, full_path)
        if full_path and os.path.exists(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))
