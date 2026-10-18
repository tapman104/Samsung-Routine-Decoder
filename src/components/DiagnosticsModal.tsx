import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { runAllDiagnostics, TestResult } from '../utils/diagnostics';
import { KNOWN_GOOD_SPEC } from '../utils/sampleData';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadKnownGoodRoutine?: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onLoadKnownGoodRoutine,
}) => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const executeTests = async () => {
    setIsRunning(true);
    setTests([]);
    try {
      const results = await runAllDiagnostics(singleResult => {
        setTests(prev => {
          const idx = prev.findIndex(t => t.id === singleResult.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = singleResult;
            return next;
          }
          return [...prev, singleResult];
        });
      });
      setTests(results);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && tests.length === 0) {
      executeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const totalCount = tests.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-[var(--surface-solid)] border border-[var(--border-glass)] rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-[var(--elevated-shadow)] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-glass)] bg-[var(--bg-subtle)]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-2xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Decoder Verification Suite
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Specification tests against known-good Python routine decoder
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-solid)] transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-[var(--bg-subtle)]/40 border-b border-[var(--border-glass)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-[var(--text-primary)]">
              Results: {passedCount} / {totalCount} Passed
            </span>
            {totalCount > 0 && passedCount === totalCount && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/25">
                100% Spec Compliant
              </span>
            )}
          </div>

          <button
            onClick={executeTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-all text-xs active:scale-95 shadow-xs"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Rerun Tests</span>
              </>
            )}
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Visual proof callout */}
          <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-teal-500/5 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Known-Good Specification Baseline</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="bg-[var(--surface-solid)]/90 p-2 rounded-xl border border-[var(--border-glass)] shadow-2xs">
                <span className="text-[var(--text-tertiary)] block text-[9px] uppercase font-sans font-semibold">Routine Name</span>
                <span className="font-bold text-[var(--text-primary)]">{KNOWN_GOOD_SPEC.routineName}</span>
              </div>
              <div className="bg-[var(--surface-solid)]/90 p-2 rounded-xl border border-[var(--border-glass)] shadow-2xs">
                <span className="text-[var(--text-tertiary)] block text-[9px] uppercase font-sans font-semibold">Body Version</span>
                <span className="font-bold text-[var(--text-primary)]">{KNOWN_GOOD_SPEC.bodyVersion}</span>
              </div>
              <div className="bg-[var(--surface-solid)]/90 p-2 rounded-xl border border-[var(--border-glass)] shadow-2xs">
                <span className="text-[var(--text-tertiary)] block text-[9px] uppercase font-sans font-semibold">Condition UUID</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{KNOWN_GOOD_SPEC.conditionUuid}</span>
              </div>
              <div className="bg-[var(--surface-solid)]/90 p-2 rounded-xl border border-[var(--border-glass)] shadow-2xs">
                <span className="text-[var(--text-tertiary)] block text-[9px] uppercase font-sans font-semibold">Action UUID</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{KNOWN_GOOD_SPEC.actionUuid}</span>
              </div>
            </div>
          </div>

          {/* Test items */}
          <div className="space-y-2.5">
            {tests.map(test => (
              <div
                key={test.id}
                className={`p-3.5 rounded-2xl border transition-all text-xs ${
                  test.status === 'passed'
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : test.status === 'failed'
                    ? 'border-rose-500/20 bg-rose-500/5'
                    : 'border-[var(--border-glass)] bg-[var(--surface-solid)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {test.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    ) : test.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    ) : (
                      <RotateCw className="w-4 h-4 text-indigo-500 animate-spin mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">
                          {test.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                          {test.durationMs}ms
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] mt-0.5">
                        {test.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      test.status === 'passed'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>

                {test.details && (
                  <div className="mt-2.5 pt-2 border-t border-[var(--border-glass)] font-mono text-[11px] text-[var(--text-secondary)]">
                    {test.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[var(--border-glass)] bg-[var(--bg-subtle)]/60 backdrop-blur-md flex items-center justify-between">
          {onLoadKnownGoodRoutine && (
            <button
              onClick={() => {
                onClose();
                onLoadKnownGoodRoutine();
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Verified Routine into Decoder</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all ml-auto active:scale-95 shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
