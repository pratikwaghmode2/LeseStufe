import sqlite3
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "app.db")

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    # Books
    c.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        level TEXT DEFAULT 'A2',
        content TEXT NOT NULL,
        total_pages INTEGER DEFAULT 1,
        current_page INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Saved Vocabulary / Flashcards
    c.execute("""
    CREATE TABLE IF NOT EXISTS saved_vocab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        lemma TEXT NOT NULL,
        level TEXT DEFAULT 'B1',
        pos TEXT,
        gender TEXT,
        translation TEXT NOT NULL,
        context_sentence TEXT,
        review_count INTEGER DEFAULT 0,
        mastered BOOLEAN DEFAULT 0,
        last_reviewed TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # User Settings
    c.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY,
        user_level TEXT DEFAULT 'A2',
        grammar_mode BOOLEAN DEFAULT 0,
        gloss_mode BOOLEAN DEFAULT 0,
        reading_theme TEXT DEFAULT 'light',
        font_size INTEGER DEFAULT 18,
        gemini_api_key TEXT DEFAULT ''
    )
    """)

    # QA / Tester Agent Test Runs
    c.execute("""
    CREATE TABLE IF NOT EXISTS test_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL,
        category TEXT NOT NULL,
        passed BOOLEAN NOT NULL,
        details TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Default settings row
    c.execute("INSERT OR IGNORE INTO user_settings (id, user_level, grammar_mode, gloss_mode, reading_theme, font_size) VALUES (1, 'A2', 0, 0, 'light', 18)")
    
    conn.commit()
    conn.close()

# DB Helpers
def get_user_settings() -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM user_settings WHERE id = 1")
    row = c.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d['grammar_mode'] = bool(d.get('grammar_mode', 0))
        d['gloss_mode'] = bool(d.get('gloss_mode', 0))
        return d
    return {'user_level': 'A2', 'grammar_mode': False, 'gloss_mode': False, 'reading_theme': 'light', 'font_size': 18, 'gemini_api_key': ''}

def update_user_settings(settings: Dict[str, Any]):
    conn = get_connection()
    c = conn.cursor()
    fields = []
    values = []
    for k, v in settings.items():
        if k in ['user_level', 'grammar_mode', 'gloss_mode', 'reading_theme', 'font_size', 'gemini_api_key']:
            fields.append(f"{k} = ?")
            if k in ['grammar_mode', 'gloss_mode']:
                values.append(1 if v else 0)
            else:
                values.append(v)
    if fields:
        values.append(1)
        c.execute(f"UPDATE user_settings SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
    conn.close()

def save_word(word: str, lemma: str, level: str, pos: str, gender: Optional[str], translation: str, context_sentence: str) -> int:
    conn = get_connection()
    c = conn.cursor()
    # Check if word or lemma already saved
    c.execute("SELECT id FROM saved_vocab WHERE lemma = ? OR word = ?", (lemma, word))
    existing = c.fetchone()
    if existing:
        conn.close()
        return existing['id']
    
    c.execute("""
    INSERT INTO saved_vocab (word, lemma, level, pos, gender, translation, context_sentence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (word, lemma, level, pos, gender, translation, context_sentence))
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return new_id

def get_saved_vocab(level: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    if level and level != 'ALL':
        c.execute("SELECT * FROM saved_vocab WHERE level = ? ORDER BY id DESC", (level,))
    else:
        c.execute("SELECT * FROM saved_vocab ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def delete_saved_word(word_id: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM saved_vocab WHERE id = ?", (word_id,))
    conn.commit()
    conn.close()

def update_word_progress(word_id: int, mastered: bool):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    UPDATE saved_vocab 
    SET review_count = review_count + 1, mastered = ?, last_reviewed = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (1 if mastered else 0, word_id))
    conn.commit()
    conn.close()

def save_book(title: str, author: str, content: str, level: str = 'A2') -> int:
    conn = get_connection()
    c = conn.cursor()
    # Approx 250 words per page
    words = content.split()
    total_pages = max(1, (len(words) + 249) // 250)
    c.execute("""
    INSERT INTO books (title, author, content, level, total_pages, current_page)
    VALUES (?, ?, ?, ?, ?, 1)
    """, (title, author, content, level, total_pages))
    book_id = c.lastrowid
    conn.commit()
    conn.close()
    return book_id

def get_books() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, title, author, level, total_pages, current_page, created_at FROM books ORDER BY id DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_book(book_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM books WHERE id = ?", (book_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def record_test_run(name: str, category: str, passed: bool, details: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    INSERT INTO test_runs (test_name, category, passed, details)
    VALUES (?, ?, ?, ?)
    """, (name, category, 1 if passed else 0, details))
    conn.commit()
    conn.close()

def get_test_runs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM test_runs ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

init_db()
