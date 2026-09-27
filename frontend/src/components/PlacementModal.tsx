import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Award, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLevelApplied: (level: string) => void;
}

export const PlacementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLevelApplied
}) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadQuestions = async () => {
    try {
      const q = await api.getPlacementQuestions();
      setQuestions(q);
      setCurrentIdx(0);
      setAnswers({});
      setSelectedOption(null);
      setResult(null);
    } catch {
      // handled
    }
  };

  const handleNext = async () => {
    if (selectedOption === null) return;
    const q = questions[currentIdx];
    const newAnswers = { ...answers, [q.id]: selectedOption };
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Submit evaluation
      setIsLoading(true);
      try {
        const evalRes = await api.evaluatePlacement(newAnswers);
        setResult(evalRes);
      } catch {
        // fallback
      } finally {
        setIsLoading(false);
      }
    }
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-left animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">German Level Placement Test</h2>
            <p className="text-xs text-slate-500">Quick 2-minute diagnostic to calibrate your reader highlights</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!result ? (
          currentQ ? (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Question {currentIdx + 1} of {questions.length}</span>
                <span className="font-bold text-amber-600">{currentQ.target_level} Level check</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {currentQ.question}
                </p>
              </div>

              <div className="space-y-2 mb-5">
                {currentQ.options.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full p-3 rounded-xl border text-xs font-medium text-left transition cursor-pointer ${
                      selectedOption === idx
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                disabled={selectedOption === null || isLoading}
                onClick={handleNext}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{currentIdx + 1 === questions.length ? 'Calculate My Level' : 'Next Question'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">Loading diagnostic test...</div>
          )
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Recommended Level:</div>
            <div className="text-4xl font-black text-amber-500 my-1">
              {result.recommended_level}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto my-3 leading-relaxed">
              {result.feedback}
            </p>

            <button
              onClick={() => {
                onLevelApplied(result.recommended_level);
                onClose();
              }}
              className="mt-3 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Apply {result.recommended_level} & Start Reading
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
