import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Sparkles,
  FileCode,
  ListTree,
} from 'lucide-react';
import {
  JsonValue,
  LosslessNumber,
  isLosslessNumber,
  stringifyLossless,
} from '../utils/losslessJson';

interface JsonViewerProps {
  data: JsonValue | string;
  title?: string;
  defaultExpandedDepth?: number;
  allowToggleView?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  defaultExpandedDepth = 2,
  allowToggleView = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [copied, setCopied] = useState(false);
  const [expandAllSignal, setExpandAllSignal] = useState<boolean | null>(null);

  // Normalized formatted text
  const formattedText = useMemo(() => {
    if (typeof data === 'string') {
      return data;
    }
    return stringifyLossless(data, 2);
  }, [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isSearchMatch = (text: string) => {
    if (!searchQuery.trim()) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/90 shadow-[var(--card-shadow)] overflow-hidden text-sm transition-all">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 bg-[var(--bg-subtle)]/70 border-b border-[var(--border-glass)] backdrop-blur-md">
        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <FileCode className="w-4 h-4" />
          </div>
          <span className="font-semibold text-xs tracking-tight">{title || 'JSON Inspector'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 font-mono font-medium border border-purple-500/20">
            Lossless 64-bit
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search keys & values..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-6 py-1.5 text-xs rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-44 sm:w-56 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs p-0.5"
              >
                ×
              </button>
            )}
          </div>

          {allowToggleView && (
            <div className="flex items-center border border-[var(--border-glass)] rounded-xl p-0.5 bg-[var(--bg-subtle)]">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all ${
                  viewMode === 'tree'
                    ? 'bg-[var(--surface-solid)] text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Interactive collapsible tree"
              >
                <ListTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tree</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all ${
                  viewMode === 'raw'
                    ? 'bg-[var(--surface-solid)] text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Formatted code text"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Code</span>
              </button>
            </div>
          )}

          {viewMode === 'tree' && (
            <div className="flex items-center gap-1 border border-[var(--border-glass)] rounded-xl p-0.5 bg-[var(--bg-subtle)]">
              <button
                type="button"
                onClick={() => setExpandAllSignal(true)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-solid)] text-xs transition-colors"
                title="Expand all nodes"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setExpandAllSignal(false)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-solid)] text-xs transition-colors"
                title="Collapse all nodes"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-all font-medium active:scale-95 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 overflow-x-auto max-h-[580px] overflow-y-auto font-mono text-[13px] leading-relaxed bg-[var(--surface-solid)]/40">
        {viewMode === 'tree' && typeof data === 'object' && data !== null ? (
          <TreeNode
            keyName={null}
            value={data}
            depth={0}
            defaultExpandedDepth={defaultExpandedDepth}
            searchQuery={searchQuery}
            expandAllSignal={expandAllSignal}
            isMatch={isSearchMatch}
          />
        ) : (
          <pre className="whitespace-pre overflow-x-auto text-[var(--text-primary)] selection:bg-indigo-500/20 font-mono text-[12px] sm:text-[13px]">
            {formattedText}
          </pre>
        )}
      </div>
    </div>
  );
};

interface TreeNodeProps {
  keyName: string | null;
  value: JsonValue;
  depth: number;
  defaultExpandedDepth: number;
  searchQuery: string;
  expandAllSignal: boolean | null;
  isMatch: (text: string) => boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  keyName,
  value,
  depth,
  defaultExpandedDepth,
  searchQuery,
  expandAllSignal,
  isMatch,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < defaultExpandedDepth);

  React.useEffect(() => {
    if (expandAllSignal !== null) {
      setIsExpanded(expandAllSignal);
    }
  }, [expandAllSignal]);

  const isArray = Array.isArray(value);
  const isObject = typeof value === 'object' && value !== null && !isLosslessNumber(value) && !isArray;
  const keyMatches = keyName ? isMatch(keyName) : false;

  // Render Primitive Values
  if (!isArray && !isObject) {
    let renderedVal: React.ReactNode;
    let isLargeInt = false;
    let rawStr = '';

    if (isLosslessNumber(value)) {
      rawStr = value.raw;
      isLargeInt = value.isLargeInteger();
      const valMatches = isMatch(rawStr);
      renderedVal = (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span
            className={`font-semibold ${
              valMatches
                ? 'bg-amber-300 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded px-1'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {rawStr}
          </span>
          {isLargeInt && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-sans font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shadow-2xs"
              title="64-bit integer preserved losslessly without IEEE 754 precision loss"
            >
              <Sparkles className="w-2.5 h-2.5 mr-0.5 text-purple-500" />
              64-bit Int
            </span>
          )}
        </span>
      );
    } else if (typeof value === 'string') {
      const valMatches = isMatch(value);
      renderedVal = (
        <span
          className={`${
            valMatches
              ? 'bg-amber-300 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded px-1'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {JSON.stringify(value)}
        </span>
      );
    } else if (typeof value === 'number') {
      const str = String(value);
      const valMatches = isMatch(str);
      renderedVal = (
        <span
          className={`${
            valMatches
              ? 'bg-amber-300 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded px-1'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {str}
        </span>
      );
    } else if (typeof value === 'boolean') {
      renderedVal = (
        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
          {value ? 'true' : 'false'}
        </span>
      );
    } else if (value === null) {
      renderedVal = <span className="text-[var(--text-tertiary)] italic">null</span>;
    }

    return (
      <div className="flex items-baseline gap-1.5 py-0.5 hover:bg-[var(--bg-subtle)]/70 rounded-md px-1.5 transition-colors">
        {keyName !== null && (
          <span
            className={`font-semibold ${
              keyMatches
                ? 'bg-amber-300 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded px-1'
                : 'text-indigo-600 dark:text-indigo-300'
            }`}
          >
            "{keyName}":
          </span>
        )}
        {renderedVal}
      </div>
    );
  }

  // Object or Array
  const entries: Array<[string | null, JsonValue]> = isArray
    ? (value as JsonValue[]).map((v, i) => [String(i), v])
    : Object.entries(value as { [key: string]: JsonValue });

  const count = entries.length;

  return (
    <div className="py-0.5">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 cursor-pointer select-none py-1 hover:bg-[var(--bg-subtle)]/70 rounded-lg px-1.5 group transition-colors"
      >
        <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-transform duration-150">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        {keyName !== null && (
          <span
            className={`font-semibold ${
              keyMatches
                ? 'bg-amber-300 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded px-1'
                : 'text-indigo-600 dark:text-indigo-300'
            }`}
          >
            "{keyName}":
          </span>
        )}

        <span className="text-[var(--text-tertiary)] font-sans text-xs">
          {isArray ? `Array(${count})` : `Object {${count}}`}
        </span>
      </div>

      {isExpanded && (
        <div className="pl-4 sm:pl-5 ml-2 border-l border-[var(--border-glass)] space-y-0.5">
          {entries.map(([k, v]) => (
            <TreeNode
              key={k ?? Math.random().toString()}
              keyName={isArray ? null : k}
              value={v}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
              searchQuery={searchQuery}
              expandAllSignal={expandAllSignal}
              isMatch={isMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
};
