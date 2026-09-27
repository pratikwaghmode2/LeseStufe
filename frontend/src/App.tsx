import React, { useState, useEffect } from 'react';
import { api, Book, UserSettings, SentenceData, VocabWord, GrammarAnalysis } from './services/api';
import { ReaderNavbar } from './components/ReaderNavbar';
import { ReaderCanvas } from './components/ReaderCanvas';
import { SentenceBar } from './components/SentenceBar';
import { GrammarDrawer } from './components/GrammarDrawer';
import { TutorDrawer } from './components/TutorDrawer';
import { FlashcardsModal } from './components/FlashcardsModal';
import { PlacementModal } from './components/PlacementModal';
import { LevelShifterModal } from './components/LevelShifterModal';
import { TestLabModal } from './components/TestLabModal';
import { BookUploadModal } from './components/BookUploadModal';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    id: 1,
    user_level: 'A2',
    grammar_mode: false,
    gloss_mode: false,
    reading_theme: 'light',
    font_size: 18
  });

  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [vocabSummary, setVocabSummary] = useState<any[]>([]);
  const [selectedSentenceDe, setSelectedSentenceDe] = useState<string>('');
  const [sentenceTranslationEn, setSentenceTranslationEn] = useState<string>('');
  const [isTranslatingSentence, setIsTranslatingSentence] = useState<boolean>(false);

  // Saved words & Flashcards
  const [savedWords, setSavedWords] = useState<VocabWord[]>([]);
  const [savedWordsMap, setSavedWordsMap] = useState<Record<string, boolean>>({});

  // Grammar & Modals state
  const [grammarAnalysis, setGrammarAnalysis] = useState<GrammarAnalysis | null>(null);
  const [isAnalyzingGrammar, setIsAnalyzingGrammar] = useState<boolean>(false);
  const [isGrammarDrawerOpen, setIsGrammarDrawerOpen] = useState<boolean>(false);
  const [isTutorDrawerOpen, setIsTutorDrawerOpen] = useState<boolean>(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState<boolean>(false);
  const [isPlacementOpen, setIsPlacementOpen] = useState<boolean>(false);
  const [isShifterOpen, setIsShifterOpen] = useState<boolean>(false);
  const [isTestLabOpen, setIsTestLabOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Initial Load
  useEffect(() => {
    loadSettings();
    loadBooks();
    loadSavedWords();
  }, []);

  // When book or page changes, process page tokens with CEFR highlights
  useEffect(() => {
    if (currentBook && currentBook.pages && currentBook.pages[currentPage - 1]) {
      const pageText = currentBook.pages[currentPage - 1];
      processPageText(pageText, settings.user_level);
      setSelectedSentenceDe('');
      setSentenceTranslationEn('');
    }
  }, [currentBook, currentPage, settings.user_level]);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      if (s) {
        setSettings({
          ...s,
          grammar_mode: Boolean(s.grammar_mode),
          gloss_mode: Boolean(s.gloss_mode)
        });
      }
    } catch {
      // fallback
    }
  };

  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    try {
      await api.updateSettings(updates);
    } catch {
      // fallback
    }
  };

  const loadBooks = async () => {
    try {
      const bList = await api.getBooks();
      setBooks(bList);
      if (bList.length > 0 && !currentBook) {
        loadBookDetails(bList[0].id);
      }
    } catch {
      // fallback
    }
  };

  const loadBookDetails = async (id: number) => {
    try {
      const b = await api.getBook(id);
      setCurrentBook(b);
      setCurrentPage(1);
    } catch {
      // fallback
    }
  };

  const loadSavedWords = async () => {
    try {
      const words = await api.getVocab();
      setSavedWords(words);
      const map: Record<string, boolean> = {};
      words.forEach(w => {
        map[w.word] = true;
        map[w.lemma] = true;
      });
      setSavedWordsMap(map);
    } catch {
      // fallback
    }
  };

  const processPageText = async (pageText: string, level: string) => {
    try {
      const res = await api.processPage(pageText, level);
      setSentences(res.sentences);
      setVocabSummary(res.vocab_summary);
    } catch {
      // fallback
    }
  };

  const handleSelectSentence = async (sentDe: string) => {
    setSelectedSentenceDe(sentDe);
    setIsTranslatingSentence(true);
    setSentenceTranslationEn('');
    try {
      const res = await api.translateSentence(sentDe);
      setSentenceTranslationEn(res.translation_en);
    } catch {
      setSentenceTranslationEn(sentDe);
    } finally {
      setIsTranslatingSentence(false);
    }

    if (settings.grammar_mode) {
      loadGrammarBreakdown(sentDe);
    }
  };

  const loadGrammarBreakdown = async (sentDe: string) => {
    setIsAnalyzingGrammar(true);
    try {
      const analysis = await api.getGrammarAnalysis(sentDe);
      setGrammarAnalysis(analysis);
    } catch {
      setGrammarAnalysis(null);
    } finally {
      setIsAnalyzingGrammar(false);
    }
  };

  const handleSaveWord = async (wordData: VocabWord) => {
    try {
      await api.saveWord(wordData);
      loadSavedWords();
    } catch {
      // fallback
    }
  };

  // Determine reading theme classes
  const themeClass = settings.reading_theme === 'sepia' 
    ? 'theme-sepia bg-[#fbf7ee] text-[#433422]'
    : settings.reading_theme === 'dark'
    ? 'theme-dark bg-slate-950 text-slate-100'
    : 'theme-light bg-slate-50 text-slate-900';

  const currentPageText = currentBook?.pages?.[currentPage - 1] || '';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${themeClass}`}>
      
      {/* Top Navigation & Controls */}
      <ReaderNavbar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        books={books}
        currentBook={currentBook}
        onSelectBook={loadBookDetails}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenFlashcards={() => setIsFlashcardsOpen(true)}
        onOpenPlacement={() => setIsPlacementOpen(true)}
        onOpenTestLab={() => setIsTestLabOpen(true)}
        onOpenTutor={() => setIsTutorDrawerOpen(true)}
        onDownloadVocabulary={() => {
          if (currentBook) {
            api.downloadVocabularyPdf(currentBook.id, settings.user_level).catch(() => undefined);
          }
        }}
        savedWordCount={savedWords.length}
      />

      {/* Main Reading Studio */}
      <main className="flex-1 flex flex-col items-center">
        {currentBook ? (
          <div className="w-full">
            <div className="max-w-5xl mx-auto px-4 pt-4 text-left">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentBook.title}
              </h1>
              <p className="text-xs text-slate-500">
                by {currentBook.author} &bull; Graded Reader Level: <span className="font-bold text-amber-600">{currentBook.level}</span>
              </p>
            </div>

            <ReaderCanvas
              sentences={sentences}
              vocabSummary={vocabSummary}
              userLevel={settings.user_level}
              grammarMode={Boolean(settings.grammar_mode)}
              glossMode={Boolean(settings.gloss_mode)}
              readingTheme={settings.reading_theme}
              currentPage={currentPage}
              totalPages={currentBook.total_pages || 1}
              onPageChange={(p) => setCurrentPage(p)}
              onSelectSentence={handleSelectSentence}
              selectedSentenceDe={selectedSentenceDe}
              onSaveWord={handleSaveWord}
              savedWordsMap={savedWordsMap}
            />
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="text-slate-400 text-sm">Loading German library...</p>
          </div>
        )}
      </main>

      {/* Bottom Sentence Bar */}
      <SentenceBar
        sentenceDe={selectedSentenceDe}
        translationEn={sentenceTranslationEn}
        isLoading={isTranslatingSentence}
        grammarMode={settings.grammar_mode}
        onOpenGrammar={() => setIsGrammarDrawerOpen(true)}
        onOpenShifter={() => setIsShifterOpen(true)}
      />

      {/* Slide-out Drawers */}
      <GrammarDrawer
        isOpen={isGrammarDrawerOpen}
        onClose={() => setIsGrammarDrawerOpen(false)}
        sentenceDe={selectedSentenceDe}
        analysis={grammarAnalysis}
        isLoading={isAnalyzingGrammar}
      />

      <TutorDrawer
        isOpen={isTutorDrawerOpen}
        onClose={() => setIsTutorDrawerOpen(false)}
        pageText={currentPageText}
        userLevel={settings.user_level}
      />

      {/* Modals */}
      <FlashcardsModal
        isOpen={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        savedWords={savedWords}
        onRefreshWords={loadSavedWords}
        userLevel={settings.user_level}
      />

      <PlacementModal
        isOpen={isPlacementOpen}
        onClose={() => setIsPlacementOpen(false)}
        onLevelApplied={(lvl) => handleUpdateSettings({ user_level: lvl })}
      />

      <LevelShifterModal
        isOpen={isShifterOpen}
        onClose={() => setIsShifterOpen(false)}
        originalText={selectedSentenceDe || currentPageText}
        userLevel={settings.user_level}
      />

      <TestLabModal
        isOpen={isTestLabOpen}
        onClose={() => setIsTestLabOpen(false)}
      />

      <BookUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        books={books}
        onSelectBook={loadBookDetails}
        onRefreshBooks={loadBooks}
      />

    </div>
  );
};

export default App;
