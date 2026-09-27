// Use the same origin in production; VITE_API_BASE_URL is useful for local split-server development.
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

export interface UserSettings {
  id: number;
  user_level: string;
  grammar_mode: boolean;
  gloss_mode: boolean;
  reading_theme: string;
  font_size: number;
  gemini_api_key?: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  level: string;
  total_pages: number;
  current_page: number;
  pages?: string[];
  content?: string;
}

export interface Token {
  text: string;
  is_word: boolean;
  lemma: string;
  level: string | null;
  pos: string | null;
  gender: string | null;
  plural: string | null;
  translation: string;
  example_de?: string;
  example_en?: string;
  is_highlighted?: boolean;
  separable_partner?: number | null;
}

export interface SentenceData {
  sentence_de: string;
  paragraph_idx?: number;
  is_line_start?: boolean;
  tokens: Token[];
}

export interface VocabWord {
  id?: number;
  word: string;
  lemma: string;
  level: string;
  pos?: string;
  gender?: string | null;
  translation: string;
  context_sentence?: string;
  review_count?: number;
  mastered?: boolean;
}

export interface GrammarAnalysis {
  main_clause: string;
  tense: string;
  case_breakdowns: Array<{ phrase: string; case: string; reason: string }>;
  grammar_tips: string;
}

export interface QAResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

export const api = {
  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return {
      ...data,
      grammar_mode: Boolean(data.grammar_mode),
      gloss_mode: Boolean(data.gloss_mode)
    };
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async getBooks(): Promise<Book[]> {
    const res = await fetch(`${API_BASE}/books`);
    return res.json();
  },

  async getBook(id: number): Promise<Book> {
    const res = await fetch(`${API_BASE}/books/${id}`);
    return res.json();
  },

  async uploadBook(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/books/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Upload failed. Please check document content.');
    }
    return data;
  },

  async processPage(page_text: string, user_level: string): Promise<{ sentences: SentenceData[]; vocab_summary: any[] }> {
    const res = await fetch(`${API_BASE}/process-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_text, user_level }),
    });
    return res.json();
  },

  async downloadVocabularyPdf(bookId: number, userLevel: string): Promise<void> {
    const res = await fetch(`${API_BASE}/books/${bookId}/vocabulary.pdf?user_level=${encodeURIComponent(userLevel)}`);
    if (!res.ok) throw new Error('Could not generate vocabulary PDF');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LeseStufe_${userLevel}_Vocabulary.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  async translateSentence(sentence_de: string): Promise<{ sentence_de: string; translation_en: string }> {
    const res = await fetch(`${API_BASE}/translate-sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence_de }),
    });
    return res.json();
  },

  async translateWord(word: string, context_sentence: string = ''): Promise<{ word: string; translation: string; level?: string; pos?: string; gender?: string | null }> {
    const res = await fetch(`${API_BASE}/translate-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, context_sentence }),
    });
    if (!res.ok) throw new Error('Word translation request failed');
    return res.json();
  },

  async getGrammarAnalysis(sentence_de: string): Promise<GrammarAnalysis> {
    const res = await fetch(`${API_BASE}/grammar-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence_de }),
    });
    return res.json();
  },

  async simplifyPassage(text_de: string, target_level: string): Promise<any> {
    const res = await fetch(`${API_BASE}/simplify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_de, target_level }),
    });
    return res.json();
  },

  async tutorChat(message: string, page_text: string, user_level: string, history: any[] = []): Promise<{ reply: string }> {
    const res = await fetch(`${API_BASE}/tutor-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, page_text, user_level, history }),
    });
    return res.json();
  },

  async getVocab(level?: string): Promise<VocabWord[]> {
    const url = level ? `${API_BASE}/vocab?level=${level}` : `${API_BASE}/vocab`;
    const res = await fetch(url);
    return res.json();
  },

  async saveWord(data: VocabWord): Promise<any> {
    const res = await fetch(`${API_BASE}/vocab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteWord(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/vocab/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async reviewWord(id: number, mastered: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/vocab/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mastered }),
    });
    return res.json();
  },

  async getQuiz(user_level: string = 'A2'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/quiz?user_level=${user_level}`);
    return res.json();
  },

  async getPlacementQuestions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/placement/questions`);
    return res.json();
  },

  async evaluatePlacement(answers: Record<number, number>): Promise<any> {
    const res = await fetch(`${API_BASE}/placement/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    return res.json();
  },

  async runQATests(): Promise<{ total: number; passed: number; failed: number; results: QAResult[] }> {
    const res = await fetch(`${API_BASE}/test/run`);
    return res.json();
  }
};
