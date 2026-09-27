import React from 'react';
import { X, BookA, CheckCircle2, Lightbulb } from 'lucide-react';
import { GrammarAnalysis } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sentenceDe: string;
  analysis: GrammarAnalysis | null;
  isLoading: boolean;
}

export const GrammarDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  sentenceDe,
  analysis,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-right duration-200 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <BookA className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Grammar Inspector</h3>
            <p className="text-[11px] text-slate-500">Case & syntax breakdown</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="my-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Sentence:</div>
        <div className="text-xs font-semibold text-slate-900 dark:text-white italic">
          "{sentenceDe}"
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400 italic">
          Analyzing sentence structure, cases, and rules...
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          
          {/* Tense & Structure */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Identified Tense & Structure:</div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs font-bold text-blue-800 dark:text-blue-300">
              {analysis.tense}
            </div>
          </div>

          {/* Case Breakdowns */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Grammatical Case Triggers:</div>
            {analysis.case_breakdowns && analysis.case_breakdowns.length > 0 ? (
              <div className="space-y-2">
                {analysis.case_breakdowns.map((cb, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{cb.phrase}</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {cb.case}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {cb.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
                Standard Subject-Verb-Object nominative/accusative alignment.
              </div>
            )}
          </div>

          {/* Grammar Tips */}
          {analysis.grammar_tips && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>Learner Tip:</span>
              </div>
              <p className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
                {analysis.grammar_tips}
              </p>
            </div>
          )}

        </div>
      ) : null}

    </div>
  );
};
