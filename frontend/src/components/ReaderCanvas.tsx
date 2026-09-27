import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, BookOpen, Volume2, Bookmark, 
  Sparkles, Layers, BookA, Info, Check
} from 'lucide-react';
import { SentenceData, Token, VocabWord } from '../services/api';
import { WordCardPopover } from './WordCardPopover';

interface Props {
  sentences: SentenceData[];
  vocabSummary: any[];
  userLevel: string;
  grammarMode: boolean;
  glossMode: boolean;
  readingTheme: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectSentence: (sentenceDe: string) => void;
  selectedSentenceDe: string;
  onSaveWord: (word: VocabWord) => void;
  savedWordsMap: Record<string, boolean>;
}

export const ReaderCanvas: React.FC<Props> = ({
  sentences,
  vocabSummary,
  userLevel,
  grammarMode,
  glossMode,
  readingTheme,
  currentPage,
  totalPages,
  onPageChange,
  onSelectSentence,
  selectedSentenceDe,
  onSaveWord,
  savedWordsMap
}) => {
  const [activeToken, setActiveToken] = useState<{ token: Token; contextSentence: string } | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [inputPage, setInputPage] = useState<string>(String(currentPage));

  React.useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        handlePageJump(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        handlePageJump(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const handlePageJump = (target?: number) => {
    const p = target !== undefined ? target : parseInt(inputPage, 10);
    if (!isNaN(p)) {
      const clamped = Math.max(1, Math.min(totalPages, p));
      onPageChange(clamped);
      setInputPage(String(clamped));
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handleWordClick = (e: React.MouseEvent, token: Token, sentenceText: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopoverPos({
      x: Math.min(window.innerWidth - 340, Math.max(20, rect.left - 100)),
      y: rect.bottom + 8 + window.scrollY
    });
    setActiveToken({ token, contextSentence: sentenceText });
  };

  const getHighlightClass = (token: Token) => {
    if (!token.is_highlighted || !token.level) return '';
    switch (token.level) {
      case 'B1': return 'hl-b1 font-medium';
      case 'B2': return 'hl-b2 font-semibold';
      case 'C1': return 'hl-c1 font-bold';
      default: return 'bg-amber-100/60 border-b border-amber-400';
    }
  };

  const getGenderClass = (gender: string | null) => {
    if (!grammarMode || !gender) return '';
    if (gender === 'der') return 'gender-der';
    if (gender === 'die') return 'gender-die';
    if (gender === 'das') return 'gender-das';
    return '';
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col md:flex-row gap-6 items-start">
      
      {/* Main Book Reader Column */}
      <div className="flex-1 w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-8 shadow-xs text-left relative min-h-[580px] flex flex-col justify-between">
        
        {/* Book Content */}
        <div className="space-y-4 text-left leading-relaxed text-slate-800 dark:text-slate-200">
          {(() => {
            const paragraphs: SentenceData[][] = [];
            sentences.forEach((sent) => {
              const pIdx = sent.paragraph_idx ?? 0;
              if (!paragraphs[pIdx]) {
                paragraphs[pIdx] = [];
              }
              paragraphs[pIdx].push(sent);
            });

            return paragraphs.map((paraSentences, pIdx) => (
              <p key={pIdx} className="mb-4 leading-relaxed">
                {paraSentences.map((sent, sIdx) => {
                  const isSentenceSelected = selectedSentenceDe === sent.sentence_de;
                  return (
                    <React.Fragment key={sIdx}>
                      {sent.is_line_start && sIdx > 0 && <br />}
                      <span
                        onClick={() => onSelectSentence(sent.sentence_de)}
                        className={`inline rounded transition cursor-pointer ${
                          isSentenceSelected 
                            ? 'bg-amber-100/70 dark:bg-amber-950/40 ring-1 ring-amber-300' 
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {sent.tokens.map((tok, tIdx) => {
                          if (!tok.is_word) {
                            if (tok.text.includes('\n')) {
                              return <span key={tIdx} className="whitespace-pre-wrap">{tok.text}</span>;
                            }
                            return <span key={tIdx}>{tok.text}</span>;
                          }

                          const hlClass = getHighlightClass(tok);
                          const genderClass = getGenderClass(tok.gender);

                          return (
                            <span
                              key={tIdx}
                              onClick={(e) => handleWordClick(e, tok, sent.sentence_de)}
                              className={`inline-block relative px-1 py-0.5 rounded cursor-pointer transition-colors duration-150 ${hlClass} ${genderClass} hover:opacity-80`}
                            >
                              {/* Gloss / Subtitle Mode (Above the word) */}
                              {Boolean(glossMode) && tok.is_highlighted && Boolean(tok.translation) ? (
                                <span className="block text-[10px] leading-none text-slate-500 dark:text-slate-400 font-normal truncate max-w-[120px] mb-0.5">
                                  {tok.translation.split(',')[0]}
                                </span>
                              ) : null}
                              <span className="text-base sm:text-lg leading-relaxed">{tok.text}</span>
                            </span>
                          );
                        })}
                      </span>
                    </React.Fragment>
                  );
                })}
              </p>
            ));
          })()}
        </div>

        {/* Pagination & Direct Page Jump Bar */}
        <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            {/* Prev Page Button Group */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => handlePageJump(1)}
                title="Jump to First Page (p. 1)"
                className="hidden sm:flex items-center px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer text-[11px] font-medium"
              >
                &laquo; First
              </button>
              <button
                disabled={currentPage <= 1}
                onClick={() => handlePageJump(currentPage - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer font-semibold text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
            </div>

            {/* Direct Page Jump Input Form (e.g. Page [ 50 ] of 100 [ Go ]) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePageJump();
              }}
              className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 px-3 py-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs"
            >
              <span className="font-medium text-slate-600 dark:text-slate-400">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onBlur={() => handlePageJump()}
                className="w-14 text-center font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg py-1 px-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition"
                title={`Enter page number (1 to ${totalPages}) and press Enter`}
              />
              <span className="text-slate-500 dark:text-slate-400">
                of <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </span>
              <button
                type="submit"
                className="ml-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-lg transition cursor-pointer text-[11px] shadow-2xs"
              >
                Go
              </button>
            </form>

            {/* Next Page Button Group */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage >= totalPages}
                onClick={() => handlePageJump(currentPage + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer font-semibold text-slate-700 dark:text-slate-200"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => handlePageJump(totalPages)}
                title={`Jump to Last Page (p. ${totalPages})`}
                className="hidden sm:flex items-center px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer text-[11px] font-medium"
              >
                Last &raquo;
              </button>
            </div>
          </div>

          {/* Rapid Scrubbing Slider for Books with 3+ Pages */}
          {totalPages > 2 && (
            <div className="flex items-center gap-3 px-1 pt-1">
              <span className="text-[10px] text-slate-400 font-semibold">p. 1</span>
              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => handlePageJump(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                title={`Slide to jump anywhere (Page ${currentPage} of ${totalPages})`}
              />
              <span className="text-[10px] text-slate-400 font-semibold">p. {totalPages}</span>
            </div>
          )}
        </div>

      </div>

      {/* Page Vocab Sidebar (Right) */}
      <div className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs text-left">
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Page Vocab ({vocabSummary.length})
            </h4>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            &gt; {userLevel}
          </span>
        </div>

        {vocabSummary.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            All words on this page match or are below your {userLevel} level!
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {vocabSummary.map((v, i) => {
              const isSaved = Boolean(savedWordsMap[v.lemma] || savedWordsMap[v.text]);
              return (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      {v.gender ? <span className="text-[10px] font-medium text-slate-400">{v.gender}</span> : null}
                      <span className="truncate">{v.lemma}</span>
                      <span className="text-[9px] font-extrabold px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {v.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {v.translation}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSaveWord({
                        word: v.text,
                        lemma: v.lemma,
                        level: v.level,
                        translation: v.translation,
                        gender: v.gender
                      });
                    }}
                    disabled={isSaved}
                    className={`p-1.5 rounded-lg shrink-0 transition cursor-pointer ${
                      isSaved
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
                    }`}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Word Popover */}
      {activeToken && popoverPos && (
        <div
          style={{ position: 'absolute', top: `${popoverPos.y}px`, left: `${popoverPos.x}px` }}
          className="z-50"
        >
          <WordCardPopover
            token={activeToken.token}
            grammarMode={grammarMode}
            onClose={() => setActiveToken(null)}
            onSaveWord={onSaveWord}
            isSaved={Boolean(savedWordsMap[activeToken.token.lemma] || savedWordsMap[activeToken.token.text])}
            contextSentence={activeToken.contextSentence}
          />
        </div>
      )}

    </div>
  );
};
