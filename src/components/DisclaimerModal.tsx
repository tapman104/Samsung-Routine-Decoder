import React from 'react';
import { X, ShieldAlert, Scale, Info } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-[var(--surface-solid)] border border-[var(--border-glass)] rounded-3xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-[var(--elevated-shadow)] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-glass)] bg-[var(--bg-subtle)]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-2xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Disclaimer
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Educational and Informational Use Only
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-solid)] transition-all active:scale-95"
            aria-label="Close disclaimer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <div className="p-3.5 rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-subtle)]/70 text-[var(--text-primary)] font-medium flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <span>
              Independent educational project · Not affiliated with Samsung · All trademarks belong to their respective owners.
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Educational and Informational Use Only
            </h3>
            <p>
              This project is an independent, community-made tool intended for educational, research, and interoperability purposes. It is not affiliated with, endorsed by, sponsored by, or officially associated with Samsung or any of its subsidiaries.
            </p>
            <p>
              All trademarks, product names, logos, software, and other intellectual property referenced by this tool belong to their respective owners. I do not claim ownership of Samsung Routines, Samsung software, the <code className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">.rtn</code> file format, or any third-party intellectual property used or referenced by this project.
            </p>
            <p>
              This tool is provided as-is, without warranties of any kind. Users are responsible for ensuring that their use of this tool complies with applicable laws, software terms, and the rights of the relevant owners.
            </p>
            <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              Routine files are intended to be processed locally in the browser. Do not upload or share routine files containing private or sensitive information.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-glass)] bg-[var(--bg-subtle)]/60 backdrop-blur-md flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all active:scale-95 shadow-xs"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
