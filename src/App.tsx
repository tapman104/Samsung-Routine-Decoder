/**
 * Samsung Routine Decoder (.rtn)
 * Premium, modern desktop-grade interface with warmth, light, subtle glassmorphism,
 * 64-bit integer preservation, and local-only Web Crypto AES-GCM decryption.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FileUp,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Binary,
  Layers,
  Archive,
  Eye,
  EyeOff,
  Sun,
  Moon,
  FlaskConical,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import {
  decodeRoutineFile,
  RoutineDecodedOutput,
} from './utils/routineDecoder';
import {
  createZipWrappedRoutine,
  createEncryptedRoutine,
  KNOWN_GOOD_SPEC,
  DEFAULT_AES_KEY,
} from './utils/sampleData';
import {
  downloadHeaderJson,
  downloadFooterJson,
  downloadRawBodyBin,
  downloadDecryptedBody,
  downloadAllBundleZip,
} from './utils/downloadHelper';
import { JsonViewer } from './components/JsonViewer';
import { HexViewer } from './components/HexViewer';
import { SummaryView } from './components/SummaryView';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { DisclaimerModal } from './components/DisclaimerModal';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [aesKey, setAesKey] = useState<string>(DEFAULT_AES_KEY);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [noDecrypt, setNoDecrypt] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedOutput, setDecodedOutput] = useState<RoutineDecodedOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'body' | 'header' | 'footer' | 'hex'>('summary');

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);

  // Persistent Theme Switcher with prefers-color-scheme fallback
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('samsung_decoder_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to html root and persist
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('samsung_decoder_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setDecodedOutput(null);
  };

  const handleDecode = async (overrideFile?: File, overrideKey?: string, overrideNoDecrypt?: boolean) => {
    const targetFile = overrideFile || file;
    if (!targetFile) {
      setError('Please select or drop a Samsung Routine (.rtn) file first.');
      return;
    }

    const keyToUse = overrideKey !== undefined ? overrideKey : aesKey;
    const noDecryptToUse = overrideNoDecrypt !== undefined ? overrideNoDecrypt : noDecrypt;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await decodeRoutineFile(targetFile, targetFile.name, {
        key: keyToUse,
        noDecrypt: noDecryptToUse,
      });
      setDecodedOutput(result);
      setActiveTab('summary');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setDecodedOutput(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    // Note: Do not clear the AES key when resetting results or selecting another file
    setNoDecrypt(false);
    setError(null);
    setDecodedOutput(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to load verified known-good sample
  const handleLoadKnownGoodSample = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const sampleFile = await createZipWrappedRoutine('Charging.rtn');
      setFile(sampleFile);
      setNoDecrypt(false);
      await handleDecode(sampleFile, undefined, false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to load encrypted sample with current or default key
  const handleLoadEncryptedSample = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const keyToUse = aesKey.trim() || DEFAULT_AES_KEY;
      const { file: encFile, key } = await createEncryptedRoutine(
        keyToUse,
        'Encrypted_Charging.rtn'
      );
      setFile(encFile);
      setNoDecrypt(false);
      await handleDecode(encFile, key, false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[var(--text-primary)] antialiased font-sans flex flex-col selection:bg-indigo-500/20">
      {/* Soft Ambient Light Glows */}
      <div
        className="ambient-glow bg-indigo-500/80 -top-20 -left-20 w-[420px] h-[420px]"
        aria-hidden="true"
      />
      <div
        className="ambient-glow bg-teal-500/70 top-32 -right-20 w-[380px] h-[380px]"
        aria-hidden="true"
      />
      <div
        className="ambient-glow bg-purple-500/60 bottom-20 left-1/3 w-[360px] h-[360px]"
        aria-hidden="true"
      />

      {/* Compact Glass Top Navigation */}
      <header className="sticky top-0 z-40 glass-nav px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-[960px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Custom Brand Mark */}
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-periwinkle-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 overflow-hidden group">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 transition-transform group-hover:rotate-45 duration-300"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-[var(--text-primary)] leading-tight">
                  Samsung Routine Decoder
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  Local-Only
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] hidden sm:block">
                Decode and inspect routine files locally
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDisclaimerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-glass)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all interactive-scale shadow-2xs"
              title="Educational and Ownership Disclaimer"
            >
              <span>Disclaimer</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-glass)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all interactive-scale shadow-2xs"
              title="Run Automated Diagnostic & Verification Tests"
            >
              <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Verification Suite</span>
            </button>

            {/* Functional Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border-glass)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all interactive-scale shadow-2xs"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition-transform rotate-0 hover:-rotate-12" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Workspace (~960px) */}
      <main className="max-w-[960px] mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6 z-10">
        {/* Quick Sample Routine Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] backdrop-blur-md shadow-[var(--card-shadow)] text-xs">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="font-medium">Test with verified routine samples:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadKnownGoodSample}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20 transition-all active:scale-95 text-[11px]"
            >
              Charging (v1.0.0 Plaintext Spec)
            </button>
            <button
              type="button"
              onClick={handleLoadEncryptedSample}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20 transition-all active:scale-95 text-[11px]"
            >
              Encrypted (v2.0 AES-GCM Spec)
            </button>
          </div>
        </div>

        {/* Decoder Workspace Box */}
        <div className="rounded-3xl border border-[var(--border-glass)] bg-[var(--surface-glass)] backdrop-blur-md shadow-[var(--card-shadow)] p-5 sm:p-7 space-y-5 transition-all">
          {/* File Selection Zone: Empty State vs Selected State Transformation */}
          <div>
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                    : 'border-[var(--border-glass)] hover:border-indigo-400/50 bg-[var(--surface-solid)]/40 hover:bg-[var(--surface-solid)]/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".rtn,.bin,.dat,application/octet-stream,application/zip"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-2xs group-hover:scale-105 transition-transform">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">
                    Drop your routine file here
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    or choose a file from your device (.rtn, ZIP-wrapped, or raw payload)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] shadow-xs interactive-scale"
                >
                  Browse file
                </button>
              </div>
            ) : (
              /* Compact File Summary (Transforms the upload zone, avoiding giant empty space) */
              <div className="p-4 rounded-2xl border border-indigo-500/25 bg-[var(--surface-solid)]/90 shadow-[var(--card-shadow)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[220px] sm:max-w-md">
                        {file.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Ready
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                      {file.size.toLocaleString()} bytes • {file.type || 'Samsung Routine format'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".rtn,.bin,.dat,application/octet-stream,application/zip"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95"
                  >
                    Change file
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-glass)] hover:bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-all active:scale-95"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Decoder Controls & Key Input */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AES Key (for Version ≥ 2.0 Encrypted Routines)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAesKey(DEFAULT_AES_KEY)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline capitalize flex items-center gap-1 cursor-pointer transition-colors"
                    title="Restore default key (308204d4308203bca003020102020900)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to default</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={aesKey}
                    onChange={e => setAesKey(e.target.value)}
                    placeholder="16, 24, 32 bytes UTF-8 string or 32, 48, 64 hex chars"
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                  <span>Supports UTF-8 or hex. Stored strictly in tab memory.</span>
                  {aesKey === DEFAULT_AES_KEY ? (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      ✓ Default key active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAesKey(DEFAULT_AES_KEY)}
                      className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </div>

              {/* Mode indicator & action preview */}
              <div className="space-y-2 rounded-2xl p-3.5 bg-[var(--bg-subtle)]/70 border border-[var(--border-glass)] text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Processing Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold">
                    Web Crypto
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Version &lt; 2.0 routines are parsed as plaintext JSON with 64-bit precision.
                  Version ≥ 2.0 files are authenticated and decrypted with Web Crypto AES-GCM.
                </p>
              </div>
            </div>

            {/* Advanced Settings Disclosure */}
            <div className="border border-[var(--border-glass)] rounded-2xl overflow-hidden bg-[var(--surface-solid)]/40 transition-all">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Advanced inspection settings</span>
                </div>
                {showAdvanced ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-4 pt-1 border-t border-[var(--border-glass)] space-y-2 text-xs bg-[var(--surface-solid)]/80 animate-in fade-in">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={noDecrypt}
                      onChange={e => setNoDecrypt(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-[var(--border-glass)]"
                    />
                    <span>Raw Mode / Do not decrypt; inspect stored body bytes directly</span>
                  </label>
                  <p className="text-[11px] text-[var(--text-secondary)] pl-6.5 leading-relaxed">
                    When checked (and no key is entered), the decoder displays the exact raw ciphertext bytes stored inside the routine file without triggering AES-GCM authentication.
                  </p>
                </div>
              )}
            </div>

            {/* Main Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDecode()}
                  disabled={!file || isProcessing}
                  className="interactive-scale flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Decoding Payload...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Decode Routine</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {decodedOutput && (
                <button
                  type="button"
                  onClick={() => downloadAllBundleZip(decodedOutput)}
                  className="interactive-scale flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                  title="Download All Decoded Files in a Single ZIP Archive"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All (.zip)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold">Decoding or Cryptographic Error</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Single Main Content Results Surface */}
        {decodedOutput && (
          <div className="rounded-3xl border border-[var(--border-glass)] bg-[var(--surface-glass)] backdrop-blur-md shadow-[var(--card-shadow)] overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Top Compact Summary Bar */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-glass)] bg-[var(--bg-subtle)]/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {decodedOutput.fileName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      v{decodedOutput.header.version}
                    </span>
                    {decodedOutput.isZipWrapped && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        ZIP Container
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] mt-0.5 font-mono text-[11px]">
                    Payload: {decodedOutput.payloadSizeBytes.toLocaleString()} B • Body: {decodedOutput.header.body_size.toLocaleString()} B • Footer: {decodedOutput.header.footer_size.toLocaleString()} B
                  </p>
                </div>
              </div>

              {/* Quick Action Downloads */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadDecryptedBody(decodedOutput)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                  title="Download Decoded / Processed Body"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Download Body {decodedOutput.body.isJson ? '(.json)' : '(.txt)'}</span>
                </button>

                {decodedOutput.body.isEncryptedVersion && (
                  <button
                    type="button"
                    onClick={() => downloadRawBodyBin(decodedOutput)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                    title="Download Original Encrypted Raw Body Bytes"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-500" />
                    <span>Download Raw Body (.bin)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Seamless Tab Navigation Bar */}
            <div className="flex border-b border-[var(--border-glass)] px-4 pt-1 bg-[var(--bg-subtle)]/30 gap-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'summary'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--surface-solid)]/40 rounded-t-xl'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('body')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'body'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--surface-solid)]/40 rounded-t-xl'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Body Content</span>
                {decodedOutput.body.has64BitIntegers && (
                  <span className="w-2 h-2 rounded-full bg-purple-500" title="Contains exact 64-bit integers" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('header')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'header'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--surface-solid)]/40 rounded-t-xl'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Header (512B)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('footer')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'footer'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--surface-solid)]/40 rounded-t-xl'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Footer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hex')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'hex'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--surface-solid)]/40 rounded-t-xl'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Hex Inspector</span>
              </button>
            </div>

            {/* Tab Contents Area */}
            <div className="p-4 sm:p-6">
              {activeTab === 'summary' && <SummaryView decoded={decodedOutput} />}

              {activeTab === 'body' && (
                <div className="space-y-4">
                  {/* Body Status Sub-bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-glass)] text-xs">
                    <div className="flex items-center gap-2">
                      {decodedOutput.body.wasDecrypted ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Decrypted Body (AES-GCM Authenticated)</span>
                        </span>
                      ) : decodedOutput.body.isEncryptedVersion ? (
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Raw Encrypted Body (Undecrypted Mode)</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Plaintext Body (Format Version &lt; 2.0)</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadDecryptedBody(decodedOutput)}
                        className="px-3 py-1 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs"
                      >
                        Download Body Output
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadRawBodyBin(decodedOutput)}
                        className="px-3 py-1 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs"
                      >
                        Download Raw Bytes (.bin)
                      </button>
                    </div>
                  </div>

                  {decodedOutput.body.parsedJson ? (
                    <JsonViewer
                      data={decodedOutput.body.parsedJson}
                      title="Decoded Body JSON"
                      defaultExpandedDepth={3}
                    />
                  ) : decodedOutput.body.isUtf8 ? (
                    <div className="border border-[var(--border-glass)] rounded-2xl bg-[var(--surface-solid)]/90 p-4">
                      <pre className="font-mono text-xs whitespace-pre-wrap overflow-x-auto text-[var(--text-primary)]">
                        {decodedOutput.body.text}
                      </pre>
                    </div>
                  ) : (
                    <HexViewer
                      bytes={decodedOutput.body.processedBytes}
                      title="Body Binary Dump (Non-UTF8 / Ciphertext)"
                      fileName={`${decodedOutput.fileName}.body.bin`}
                    />
                  )}
                </div>
              )}

              {activeTab === 'header' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-glass)] text-xs">
                    <span className="text-[var(--text-secondary)]">
                      Standard 512-byte header block (null-padded with {decodedOutput.header.nullPaddingBytes} zero bytes).
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadHeaderJson(decodedOutput)}
                      className="px-3 py-1 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs"
                    >
                      Download Header JSON
                    </button>
                  </div>
                  <JsonViewer
                    data={decodedOutput.header.rawJson}
                    title="Header Metadata (512 Bytes)"
                    defaultExpandedDepth={2}
                  />
                </div>
              )}

              {activeTab === 'footer' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-glass)] text-xs">
                    <span className="text-[var(--text-secondary)]">
                      Footer segment starting at offset {decodedOutput.offsets.footerStart} ({decodedOutput.header.footer_size} bytes).
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadFooterJson(decodedOutput)}
                      className="px-3 py-1 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs"
                    >
                      Download Footer JSON
                    </button>
                  </div>
                  <JsonViewer
                    data={decodedOutput.footer.rawJson}
                    title="Footer Metadata"
                    defaultExpandedDepth={2}
                  />
                </div>
              )}

              {activeTab === 'hex' && (
                <HexViewer
                  bytes={decodedOutput.body.rawEncryptedBytes}
                  title="Stored Body Bytes (Hex Dump)"
                  fileName={`${decodedOutput.fileName}.body.raw.bin`}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-glass)] bg-[var(--surface-solid)]/70 py-4 px-4 sm:px-6 text-xs text-[var(--text-secondary)] z-10 backdrop-blur-md">
        <div className="max-w-[960px] mx-auto space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <span className="text-[11px] text-[var(--text-tertiary)] text-center sm:text-left">
              Independent educational project · Not affiliated with Samsung · All trademarks belong to their respective owners.
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsDisclaimerOpen(true)}
                className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
              >
                Disclaimer
              </button>
              <span className="text-[var(--text-tertiary)]">•</span>
              <button
                type="button"
                onClick={() => setIsDiagnosticsOpen(true)}
                className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
              >
                Verification Suite &rarr;
              </button>
            </div>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] text-center sm:text-left border-t border-[var(--border-glass)]/40 pt-2 flex flex-col sm:flex-row items-center justify-between gap-1">
            <span>Samsung Routine Decoder • 100% Client-Side Web Crypto AES-GCM • No telemetry or storage</span>
            <span>Static Hosting Target: Cloudflare Pages</span>
          </div>
        </div>
      </footer>

      {/* Automated Diagnostics & Verification Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onLoadKnownGoodRoutine={handleLoadKnownGoodSample}
      />

      {/* Ownership & Educational-Use Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
