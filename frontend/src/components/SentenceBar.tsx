import React from 'react';
import { Sparkles, BookA, Volume2, ArrowRight } from 'lucide-react';

interface Props {
  sentenceDe: string;
  translationEn: string;
  isLoading: boolean;
  grammarMode: boolean;
  onOpenGrammar: () => void;
  onOpenShifter: () => void;
}

export const SentenceBar: React.FC<Props> = ({
  sentenceDe,
  translationEn,
  isLoading,
  grammarMode,
  onOpenGrammar,
  onOpenShifter
}) => {
  if (!sentenceDe) return null;

  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Sentence Text & Translation */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => speakGerman(sentenceDe)}
              title="Listen to full German sentence"
              className="p-1 rounded-full text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {sentenceDe}
            </p>
          </div>

          <div className="text-xs md:text-sm text-amber-700 dark:text-amber-400 font-medium pl-6">
            {isLoading ? (
              <span className="italic text-slate-400">Translating sentence...</span>
            ) : (
              translationEn || 'Click word to inspect or view translation'
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={onOpenShifter}
            title="Simplify this sentence into easier German"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simplify</span>
          </button>

          {grammarMode && (
            <button
              onClick={onOpenGrammar}
              title="Inspect cases and grammar rules for this sentence"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              <BookA className="w-3.5 h-3.5" />
              <span>Grammar</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
