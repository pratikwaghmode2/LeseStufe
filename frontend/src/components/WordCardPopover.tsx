import React, { useEffect, useState } from 'react';
import { Volume2, Bookmark, Check, X, Sparkles } from 'lucide-react';
import { api, Token, VocabWord } from '../services/api';

interface Props {
  token: Token;
  grammarMode: boolean;
  onClose: () => void;
  onSaveWord: (word: VocabWord) => void;
  isSaved: boolean;
  contextSentence?: string;
}

export const WordCardPopover: React.FC<Props> = ({
  token,
  grammarMode,
  onClose,
  onSaveWord,
  isSaved,
  contextSentence
}) => {
  const [displayToken, setDisplayToken] = useState<Token>(token);
  const [isResolving, setIsResolving] = useState(false);
  const [translationError, setTranslationError] = useState(false);

  useEffect(() => {
    let active = true;
    setDisplayToken(token);
    setTranslationError(false);
    const normalizedMeaning = token.translation?.trim().toLowerCase() || '';
    const hasRealMeaning = Boolean(normalizedMeaning) && normalizedMeaning !== token.text.trim().toLowerCase() && !normalizedMeaning.includes('(compound:') && !normalizedMeaning.includes('(prefix of');
    if (!hasRealMeaning) {
      setIsResolving(true);
      api.translateWord(token.text, contextSentence).then((result) => {
        if (active && result.translation) {
          setDisplayToken({ ...token, translation: result.translation, level: result.level || token.level, pos: result.pos || token.pos, gender: result.gender ?? token.gender });
        } else if (active) {
          setTranslationError(true);
        }
      }).catch(() => {
        if (active) setTranslationError(true);
      }).finally(() => {
        if (active) setIsResolving(false);
      });
    } else {
      setIsResolving(false);
    }
    return () => { active = false; };
  }, [token, contextSentence]);

  const speakGerman = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getGenderColor = (gender: string | null) => {
    if (gender === 'der') return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800';
    if (gender === 'die') return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
    if (gender === 'das') return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
    return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getLevelBadgeColor = (level: string | null) => {
    switch (level) {
      case 'A1': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      case 'A2': return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800';
      case 'B1': return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'B2': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
      case 'C1': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      default: return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 w-80 text-left animate-in fade-in zoom-in-95 duration-150">
      
      {/* Header: Word & Audio & Close */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {displayToken.gender ? `${displayToken.gender} ` : ''}{displayToken.lemma || displayToken.text}
            </span>
            <button
              onClick={() => speakGerman(displayToken.lemma || displayToken.text)}
              title="Listen to German pronunciation"
              className="p-1 rounded-full text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          {displayToken.lemma && displayToken.lemma !== displayToken.text && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              in text: <span className="font-semibold">{displayToken.text}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {displayToken.level && (
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${getLevelBadgeColor(displayToken.level)}`}>
              {displayToken.level}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grammar Badges (Visible if Grammar Mode is ON) */}
      {grammarMode && (
        <div className="flex flex-wrap gap-1.5 my-2.5">
          {displayToken.gender && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getGenderColor(displayToken.gender)}`}>
              {displayToken.gender === 'der' ? 'Maskulin (der)' : displayToken.gender === 'die' ? 'Feminin (die)' : 'Neutrum (das)'}
            </span>
          )}
          {displayToken.plural && (
            <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              Pl: {displayToken.plural}
            </span>
          )}
          {displayToken.pos && (
            <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 capitalize">
              {displayToken.pos}
            </span>
          )}
        </div>
      )}

      {/* English Translation */}
      <div className="my-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
          English Meaning:
        </div>
        <div className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {isResolving
            ? 'Translating with Gemini...'
            : displayToken.translation || (translationError ? 'Gemini translation unavailable' : 'No English meaning available')}
        </div>
      </div>

      {/* Example Sentence */}
      {displayToken.example_de && (
        <div className="my-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
          <p className="font-medium text-slate-800 dark:text-slate-200 italic mb-0.5">
            "{displayToken.example_de}"
          </p>
          {displayToken.example_en && (
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              {displayToken.example_en}
            </p>
          )}
        </div>
      )}

      {/* Footer: Save Button */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          onClick={() => {
            onSaveWord({
              word: displayToken.text,
              lemma: displayToken.lemma || displayToken.text,
              level: displayToken.level || 'B1',
              pos: displayToken.pos || 'noun',
              gender: displayToken.gender,
              translation: displayToken.translation,
              context_sentence: contextSentence || ''
            });
          }}
          disabled={isSaved || isResolving || !displayToken.translation}
          className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            isSaved
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Saved in Flashcards</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isResolving ? 'Translating...' : displayToken.translation ? 'Save to Flashcards' : 'Translation required'}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
