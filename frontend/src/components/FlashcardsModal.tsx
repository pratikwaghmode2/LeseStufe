import React, { useState, useEffect } from 'react';
import { X, Volume2, RotateCw, Check, Trash2, Download, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { VocabWord, api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  savedWords: VocabWord[];
  onRefreshWords: () => void;
  userLevel: string;
}

export const FlashcardsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  savedWords,
  onRefreshWords,
  userLevel
}) => {
  const [tab, setTab] = useState<'cards' | 'quiz' | 'list'>('cards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    if (tab === 'quiz' && quizQuestions.length === 0) {
      loadQuiz();
    }
  }, [tab]);

  if (!isOpen) return null;

  const loadQuiz = async () => {
    try {
      const q = await api.getQuiz(userLevel);
      setQuizQuestions(q);
      setQuizIndex(0);
      setSelectedOption(null);
      setIsQuizSubmitted(false);
      setQuizScore(0);
    } catch {
      // handled
    }
  };

  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const exportToAnki = () => {
    if (!savedWords.length) return;
    const csvContent = "data:text/csv;charset=utf-8," + 
      ["German Word,Translation,Level,Gender,Context Sentence",
        ...savedWords.map(w => `"${w.word}","${w.translation}","${w.level}","${w.gender || ''}","${(w.context_sentence || '').replace(/"/g, '""')}"`)
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LeseStufe_German_Vocab_${userLevel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentWord = savedWords[currentIndex];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % savedWords.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + savedWords.length) % savedWords.length);
  };

  const handleDeleteWord = async (id?: number) => {
    if (!id) return;
    await api.deleteWord(id);
    onRefreshWords();
    if (currentIndex >= savedWords.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 text-left flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Study & Flashcard Deck</h2>
            <p className="text-xs text-slate-500">{savedWords.length} saved words in your collection</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between gap-2 my-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setTab('cards'); setIsFlipped(false); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                tab === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Flip Cards
            </button>
            <button
              onClick={() => setTab('quiz')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                tab === 'quiz' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Fill-in-Blank Quiz
            </button>
            <button
              onClick={() => setTab('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                tab === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Vocab List
            </button>
          </div>

          {savedWords.length > 0 && (
            <button
              onClick={exportToAnki}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Anki (CSV)</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto">
          {savedWords.length === 0 && tab !== 'quiz' ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <p className="mb-2">No words saved yet.</p>
              <p className="text-xs text-slate-500">Click any highlighted word while reading and press "+ Save to Flashcards"!</p>
            </div>
          ) : tab === 'cards' && currentWord ? (
            <div className="flex flex-col items-center">
              
              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-md h-64 my-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-800 dark:to-slate-800/80 shadow-md flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider">{currentWord.level} Level</span>
                  <span>Card {currentIndex + 1} of {savedWords.length}</span>
                </div>

                <div className="text-center my-auto">
                  {!isFlipped ? (
                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        {currentWord.gender ? `${currentWord.gender} ` : ''}{currentWord.lemma || currentWord.word}
                      </div>
                      {currentWord.context_sentence && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic max-w-sm mx-auto line-clamp-2">
                          "{currentWord.context_sentence}"
                        </p>
                      )}
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-4">
                        (Click to reveal English meaning)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-2">
                        {currentWord.translation}
                      </div>
                      {currentWord.pos && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          {currentWord.pos}
                        </span>
                      )}
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakGerman(currentWord.lemma || currentWord.word);
                          }}
                          className="p-2 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{currentWord.pos || 'vocabulary'}</span>
                  <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> Flip</span>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handlePrevCard}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteWord(currentWord.id)}
                  title="Remove from flashcards"
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextCard}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : tab === 'quiz' ? (
            <div className="p-2">
              {quizQuestions.length > 0 && quizIndex < quizQuestions.length ? (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>Question {quizIndex + 1} of {quizQuestions.length}</span>
                    <span className="font-bold text-amber-600">Score: {quizScore}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      {quizQuestions[quizIndex].sentence_with_blank}
                    </div>
                    {quizQuestions[quizIndex].english_hint && (
                      <div className="text-xs text-slate-500">
                        Hint: <span className="italic">{quizQuestions[quizIndex].english_hint}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {quizQuestions[quizIndex].options.map((opt: string, i: number) => {
                      const isCorrect = opt === quizQuestions[quizIndex].correct_answer;
                      let btnStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200";
                      if (isQuizSubmitted) {
                        if (isCorrect) btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
                        else if (selectedOption === opt) btnStyle = "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
                      } else if (selectedOption === opt) {
                        btnStyle = "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200";
                      }

                      return (
                        <button
                          key={i}
                          disabled={isQuizSubmitted}
                          onClick={() => setSelectedOption(opt)}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition cursor-pointer ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {!isQuizSubmitted ? (
                    <button
                      disabled={!selectedOption}
                      onClick={() => {
                        setIsQuizSubmitted(true);
                        if (selectedOption === quizQuestions[quizIndex].correct_answer) {
                          setQuizScore(quizScore + 1);
                        }
                      }}
                      className="w-full py-2 bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-amber-600 transition cursor-pointer"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <div>
                      {quizQuestions[quizIndex].explanation && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200">
                          {quizQuestions[quizIndex].explanation}
                        </p>
                      )}
                      <button
                        onClick={() => {
                          setSelectedOption(null);
                          setIsQuizSubmitted(false);
                          setQuizIndex(quizIndex + 1);
                        }}
                        className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Next Question &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Quiz Finished!</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    You scored {quizScore} out of {quizQuestions.length} correct.
                  </p>
                  <button
                    onClick={loadQuiz}
                    className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {savedWords.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {w.gender ? <span className="font-medium text-slate-500">{w.gender} </span> : ''}
                      {w.lemma || w.word}
                      <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                        {w.level}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                      {w.translation}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => speakGerman(w.lemma || w.word)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWord(w.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
