import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, Check } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  userLevel: string;
}

export const LevelShifterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  originalText,
  userLevel
}) => {
  const [targetLevel, setTargetLevel] = useState<string>('A2');
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimplify = async () => {
    setIsLoading(true);
    try {
      const res = await api.simplifyPassage(originalText, targetLevel);
      setSimplifiedText(res.simplified_text);
      setSummary(res.changes_summary);
    } catch {
      setSimplifiedText("Could not simplify passage at this moment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 text-left animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Level-Shifter Simplifier</h2>
              <p className="text-xs text-slate-500">Paraphrase complex German sentences into clear A2/B1 phrasing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Target Level:</span>
            {['A1', 'A2', 'B1'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setTargetLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  targetLevel === lvl
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={handleSimplify}
            disabled={isLoading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Simplifying...' : `Rewrite into ${targetLevel}`}</span>
          </button>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          
          {/* Original */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Original Text:</div>
            <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
              {originalText}
            </p>
          </div>

          {/* Simplified */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-2">
              Simplified ({targetLevel}):
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 italic">Level-Shifter Agent is restructuring text...</p>
            ) : simplifiedText ? (
              <div>
                <p className="text-xs leading-relaxed text-indigo-950 dark:text-indigo-200 font-medium">
                  {simplifiedText}
                </p>
                {summary && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 italic">
                    {summary}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Click 'Rewrite' above to see the parallel simplified version.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
