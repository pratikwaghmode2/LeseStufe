import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, XCircle, RotateCw, AlertTriangle } from 'lucide-react';
import { api, QAResult } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TestLabModal: React.FC<Props> = ({
  isOpen,
  onClose
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{ total: number; passed: number; failed: number; results: QAResult[] } | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await api.runQATests();
      setTestResults(res);
    } catch {
      // handled
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-left animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Software QA & Linguistic Tester Agent</h2>
              <p className="text-xs text-slate-500">Autonomous tester for German logic, vocabulary export, OCR, and frontend UX quality</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button & Summary */}
        <div className="flex items-center justify-between my-4">
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Linguistic Test Suite...' : 'Run QA Test Suite'}</span>
          </button>

          {testResults && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {testResults.passed} Passed
              </span>
              {testResults.failed > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {testResults.failed} Failed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2.5">
          {testResults ? (
            testResults.results.map((r, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{r.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {r.details}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              Click 'Run QA Test Suite' to check language logic, export quality, OCR enrichment, and the UI experience score.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
