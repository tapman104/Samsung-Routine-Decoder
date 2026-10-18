import React, { useState } from 'react';
import {
  RoutineDecodedOutput,
  RoutineCondition,
  RoutineAction,
} from '../utils/routineDecoder';
import {
  Sparkles,
  Zap,
  BellRing,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { KNOWN_GOOD_SPEC } from '../utils/sampleData';

interface SummaryViewProps {
  decoded: RoutineDecodedOutput;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ decoded }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
    }
  };

  const summary = decoded.summary;
  const isKnownGoodMatch =
    summary?.name === KNOWN_GOOD_SPEC.routineName &&
    summary?.conditions?.some(c => String(c.uuid) === KNOWN_GOOD_SPEC.conditionUuid) &&
    summary?.actions?.some(a => String(a.uuid) === KNOWN_GOOD_SPEC.actionUuid);

  return (
    <div className="space-y-6">
      {/* 64-bit Integrity & Guarantee Banner */}
      <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-teal-500/5 backdrop-blur-md shadow-[var(--card-shadow)] flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 shrink-0 border border-purple-500/20 shadow-2xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              64-bit Integer &amp; UUID Integrity Active
            </h3>
            {isKnownGoodMatch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <CheckCircle2 className="w-3 h-3" />
                Verified Python Decoder Match
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Standard browser <code className="bg-purple-500/10 dark:bg-purple-500/20 px-1 py-0.5 rounded font-mono text-[11px] font-semibold">JSON.parse()</code> rounds 64-bit numbers beyond $2^{53}-1$ (e.g. <code>...2209</code> &rarr; <code>...2000</code>).
            Our parser constructs a lossless AST and stringizer, maintaining 100% exact numeric digits.
          </p>
        </div>
      </div>

      {/* Routine Metadata Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/80 shadow-[var(--card-shadow)] hover:border-[var(--border-hover)] transition-all">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Routine Name</span>
          <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-1 truncate">
            {summary?.name || decoded.fileName.replace(/\.[^/.]+$/, '')}
          </p>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            Body Version: {summary?.bodyVersion || 'N/A'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/80 shadow-[var(--card-shadow)] hover:border-[var(--border-hover)] transition-all">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Security &amp; State</span>
          <div className="flex items-center gap-1.5 mt-1">
            {decoded.body.wasDecrypted ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                AES-GCM Decrypted
              </span>
            ) : decoded.body.isEncryptedVersion ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                <ShieldAlert className="w-3.5 h-3.5" />
                Raw / Undecrypted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                Plaintext (v{decoded.header.version})
              </span>
            )}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">Header v{decoded.header.version}</span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/80 shadow-[var(--card-shadow)] hover:border-[var(--border-hover)] transition-all">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Container Format</span>
          <div className="flex items-center gap-1.5 mt-1 font-semibold text-[var(--text-primary)] text-sm">
            <Archive className="w-4 h-4 text-indigo-500" />
            <span>{decoded.isZipWrapped ? 'ZIP Archive' : 'Direct .rtn Binary'}</span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] truncate block">
            {decoded.isZipWrapped ? `Entry: ${decoded.zipEntryName}` : 'Raw payload'}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/80 shadow-[var(--card-shadow)] hover:border-[var(--border-hover)] transition-all">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Rule Nodes</span>
          <div className="flex items-center gap-3 mt-1 font-semibold text-[var(--text-primary)] text-sm">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {summary?.conditions.length ?? 0} {summary?.conditions.length === 1 ? 'Trigger' : 'Triggers'}
            </span>
            <span className="flex items-center gap-1">
              <BellRing className="w-3.5 h-3.5 text-indigo-500" />
              {summary?.actions.length ?? 0} {summary?.actions.length === 1 ? 'Action' : 'Actions'}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            {decoded.payloadSizeBytes.toLocaleString()} bytes payload
          </span>
        </div>
      </div>

      {/* Conditions (Triggers) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Trigger Conditions ({summary?.conditions.length ?? 0})
          </h3>
        </div>

        {summary && summary.conditions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {summary.conditions.map((cond: RoutineCondition, idx: number) => {
              const uuidStr = String(cond.uuid ?? '');
              const isMatchUuid = uuidStr === KNOWN_GOOD_SPEC.conditionUuid;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/90 shadow-[var(--card-shadow)] space-y-2.5 transition-all hover:border-[var(--border-hover)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-xs font-semibold border border-amber-500/20">
                      {cond.tag || 'Unknown condition'}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium">Condition #{idx + 1}</span>
                  </div>

                  {cond.uuid !== undefined && (
                    <div className="flex items-center justify-between bg-[var(--bg-subtle)] p-2.5 rounded-xl text-xs font-mono border border-[var(--border-glass)]">
                      <div>
                        <span className="text-[var(--text-tertiary)] select-none block text-[10px] font-sans font-semibold">
                          Exact 64-bit UUID
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {uuidStr}
                        </span>
                        {isMatchUuid && (
                          <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                            ✓ Spec Verified
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(uuidStr, `cond-${idx}`)}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs"
                        title="Copy exact UUID digits"
                      >
                        {copiedKey === `cond-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {cond.parameters && Object.keys(cond.parameters).length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                        Parameters
                      </span>
                      <pre className="p-2.5 rounded-xl bg-[var(--bg-subtle)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)] border border-[var(--border-glass)]">
                        {JSON.stringify(cond.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-[var(--border-glass)] text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-solid)]/40">
            No condition definitions detected in parsed JSON body.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <BellRing className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Actions ({summary?.actions.length ?? 0})
          </h3>
        </div>

        {summary && summary.actions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {summary.actions.map((act: RoutineAction, idx: number) => {
              const uuidStr = String(act.uuid ?? '');
              const isMatchUuid = uuidStr === KNOWN_GOOD_SPEC.actionUuid;
              const title = act.parameters?.title;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/90 shadow-[var(--card-shadow)] space-y-2.5 transition-all hover:border-[var(--border-hover)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold border border-indigo-500/20">
                      {act.tag || 'Unknown action'}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium">Action #{idx + 1}</span>
                  </div>

                  {title && (
                    <div className="text-xs">
                      <span className="text-[var(--text-tertiary)] text-[10px] uppercase block font-bold">
                        Notification Title
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] text-sm">
                        {title}
                      </span>
                    </div>
                  )}

                  {act.uuid !== undefined && (
                    <div className="flex items-center justify-between bg-[var(--bg-subtle)] p-2.5 rounded-xl text-xs font-mono border border-[var(--border-glass)]">
                      <div>
                        <span className="text-[var(--text-tertiary)] select-none block text-[10px] font-sans font-semibold">
                          Exact 64-bit UUID
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {uuidStr}
                        </span>
                        {isMatchUuid && (
                          <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                            ✓ Spec Verified
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(uuidStr, `act-${idx}`)}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs"
                        title="Copy exact UUID digits"
                      >
                        {copiedKey === `act-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {act.parameters && Object.keys(act.parameters).length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                        Action Parameters
                      </span>
                      <pre className="p-2.5 rounded-xl bg-[var(--bg-subtle)] font-mono text-[11px] overflow-x-auto text-[var(--text-primary)] border border-[var(--border-glass)]">
                        {JSON.stringify(act.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-[var(--border-glass)] text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-solid)]/40">
            No action definitions detected in parsed JSON body.
          </div>
        )}
      </div>

      {/* Routine Attributes (if present) */}
      {summary?.attributes && Object.keys(summary.attributes).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Routine Attributes</h3>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/80 shadow-[var(--card-shadow)]">
            <pre className="font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
              {JSON.stringify(summary.attributes, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Binary Layout & Offset Map */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Info className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Binary Layout &amp; Verified Offsets
          </h3>
        </div>

        <div className="border border-[var(--border-glass)] rounded-2xl overflow-hidden text-xs bg-[var(--surface-solid)]/90 shadow-[var(--card-shadow)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-glass)] text-[var(--text-tertiary)] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4">Offset Range</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Format / State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-glass)] font-mono">
              <tr className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                <td className="py-2.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">Header</td>
                <td className="py-2.5 px-4 text-[var(--text-primary)]">
                  0 – {decoded.offsets.headerEnd - 1}
                </td>
                <td className="py-2.5 px-4 text-[var(--text-secondary)]">512 B</td>
                <td className="py-2.5 px-4 font-sans text-[var(--text-secondary)]">
                  UTF-8 JSON (null-padded, {decoded.header.nullPaddingBytes} zero bytes)
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                <td className="py-2.5 px-4 font-bold text-teal-600 dark:text-teal-400">Body</td>
                <td className="py-2.5 px-4 text-[var(--text-primary)]">
                  {decoded.offsets.bodyStart} – {decoded.offsets.bodyEnd - 1}
                </td>
                <td className="py-2.5 px-4 text-[var(--text-secondary)]">{decoded.header.body_size.toLocaleString()} B</td>
                <td className="py-2.5 px-4 font-sans text-[var(--text-secondary)]">
                  {decoded.body.wasDecrypted
                    ? 'Decrypted Plaintext (AES-GCM Authenticated)'
                    : decoded.body.isEncryptedVersion
                    ? 'Encrypted Ciphertext'
                    : 'Plaintext (unencrypted)'}
                </td>
              </tr>
              <tr className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                <td className="py-2.5 px-4 font-bold text-purple-600 dark:text-purple-400">Footer</td>
                <td className="py-2.5 px-4 text-[var(--text-primary)]">
                  {decoded.offsets.footerStart} – {decoded.offsets.footerEnd - 1}
                </td>
                <td className="py-2.5 px-4 text-[var(--text-secondary)]">{decoded.header.footer_size.toLocaleString()} B</td>
                <td className="py-2.5 px-4 font-sans text-[var(--text-secondary)]">
                  UTF-8 JSON
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
