import React from 'react';
import { 
  BookOpen, Sparkles, BookA, Volume2, ShieldCheck, Download,
  HelpCircle, Settings, Upload, Bookmark, Layers
} from 'lucide-react';
import { Book, UserSettings } from '../services/api';

interface Props {
  settings: UserSettings;
  onUpdateSettings: (s: Partial<UserSettings>) => void;
  books: Book[];
  currentBook: Book | null;
  onSelectBook: (id: number) => void;
  onOpenUpload: () => void;
  onOpenFlashcards: () => void;
  onOpenPlacement: () => void;
  onOpenTestLab: () => void;
  onOpenTutor: () => void;
  onDownloadVocabulary: () => void;
  savedWordCount: number;
}

export const ReaderNavbar: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  books,
  currentBook,
  onSelectBook,
  onOpenUpload,
  onOpenFlashcards,
  onOpenPlacement,
  onOpenTestLab,
  onOpenTutor,
  onDownloadVocabulary,
  savedWordCount
}) => {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand & Book Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-extrabold shadow-xs">
              L
            </span>
            <span>LeseStufe<span className="text-amber-500 font-medium text-xs ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">AI</span></span>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Book Switcher */}
          <div className="flex items-center gap-1.5">
            <select
              value={currentBook?.id || ''}
              onChange={(e) => onSelectBook(Number(e.target.value))}
              className="text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 max-w-[160px] sm:max-w-[220px] truncate outline-hidden transition cursor-pointer"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.level}] {b.title}
                </option>
              ))}
            </select>

            <button
              onClick={onOpenUpload}
              title="Upload book (PDF/TXT) or open Library"
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: CEFR Level Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1.5 uppercase tracking-wider hidden sm:inline">
            My Level:
          </span>
          {levels.map((lvl) => {
            const isSelected = settings.user_level === lvl;
            return (
              <button
                key={lvl}
                onClick={() => onUpdateSettings({ user_level: lvl })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
              >
                {lvl}
              </button>
            );
          })}
          <button
            onClick={onOpenPlacement}
            title="Optional 2-minute diagnostic test to find your German level"
            className="ml-1 p-1 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-md transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Controls: primary study actions plus a compact display menu */}
        <div className="flex items-center gap-2">
          {/* Secondary reading controls */}
          <details className="relative">
            <summary
              aria-label="Open reading settings"
              title="Reading settings"
              className="list-none p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer [&::-webkit-details-marker]:hidden"
            >
              <Settings className="w-4 h-4" />
            </summary>
            <div className="absolute right-0 top-10 z-50 w-64 p-3 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Reading settings</p>
              <button
                onClick={() => onUpdateSettings({ grammar_mode: !settings.grammar_mode })}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${settings.grammar_mode ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
              >
                <span className="flex items-center gap-2"><BookA className="w-3.5 h-3.5" /> Grammar</span>
                <span>{settings.grammar_mode ? 'On' : 'Off'}</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ gloss_mode: !settings.gloss_mode })}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${settings.gloss_mode ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
              >
                <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Subtitles</span>
                <span>{settings.gloss_mode ? 'On' : 'Off'}</span>
              </button>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {(['light', 'sepia', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => onUpdateSettings({ reading_theme: t })}
                    className={`flex-1 px-1.5 py-1.5 text-[11px] font-bold rounded-md capitalize transition cursor-pointer ${settings.reading_theme === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </details>

          {/* Flashcards Deck */}
          <button
            onClick={onOpenFlashcards}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/80 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">Flashcards</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full font-bold">
              {savedWordCount}
            </span>
          </button>

          {/* Vocabulary PDF Export */}
          <button
            onClick={onDownloadVocabulary}
            disabled={!currentBook}
            title="Download vocabulary with English meanings as a PDF"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 disabled:opacity-40 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Vocabulary PDF</span>
          </button>

          {/* AI Tutor Button */}
          <button
            onClick={onOpenTutor}
            title="Chat with LeseTutor AI"
            className="p-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* QA Tester Agent Lab */}
          <button
            onClick={onOpenTestLab}
            title="Open Software QA & Linguistic Tester Agent Lab"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
