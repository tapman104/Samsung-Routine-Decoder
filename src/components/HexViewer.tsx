import React, { useState, useMemo } from 'react';
import { Binary, Download } from 'lucide-react';

interface HexViewerProps {
  bytes: Uint8Array;
  title?: string;
  fileName?: string;
}

export const HexViewer: React.FC<HexViewerProps> = ({
  bytes,
  title = 'Raw Binary Dump',
  fileName = 'payload.bin',
}) => {
  const [pageSize, setPageSize] = useState(512);

  const displayBytes = useMemo(() => {
    return bytes.slice(0, pageSize);
  }, [bytes, pageSize]);

  const rows = useMemo(() => {
    const list: Array<{
      offset: string;
      hexParts: string[];
      ascii: string;
    }> = [];

    for (let i = 0; i < displayBytes.length; i += 16) {
      const slice = displayBytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(8, '0');
      const hexParts: string[] = [];
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        if (j < slice.length) {
          const b = slice[j];
          hexParts.push(b.toString(16).padStart(2, '0'));
          // Printable ASCII (32-126)
          ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '·';
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
      }

      list.push({ offset, hexParts, ascii });
    }
    return list;
  }, [displayBytes]);

  const handleDownload = () => {
    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-solid)]/90 shadow-[var(--card-shadow)] overflow-hidden text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 bg-[var(--bg-subtle)]/70 border-b border-[var(--border-glass)] backdrop-blur-md">
        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Binary className="w-4 h-4" />
          </div>
          <span className="font-semibold text-xs tracking-tight">{title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono border border-[var(--border-glass)]">
            {bytes.length.toLocaleString()} bytes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {bytes.length > pageSize && (
            <button
              type="button"
              onClick={() => setPageSize(prev => prev + 1024)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 font-medium"
            >
              Load +1024 bytes ({Math.min(pageSize + 1024, bytes.length)} / {bytes.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-glass)] bg-[var(--surface-solid)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-all font-medium active:scale-95 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Download .bin</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-[12px] leading-snug select-text bg-[var(--surface-solid)]/30">
        <div className="min-w-[620px] space-y-1">
          {/* Hex columns header */}
          <div className="flex text-[var(--text-tertiary)] pb-1.5 border-b border-[var(--border-glass)] font-semibold text-[11px]">
            <span className="w-20">Offset</span>
            <span className="w-64 tracking-widest">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
            <span className="ml-4">Decoded Text</span>
          </div>

          {rows.map(r => (
            <div
              key={r.offset}
              className="flex hover:bg-indigo-500/10 px-1.5 py-0.5 rounded-md transition-colors"
            >
              <span className="w-20 text-indigo-600 dark:text-indigo-400 select-none font-semibold">
                {r.offset}
              </span>
              <div className="w-64 flex gap-1 text-[var(--text-primary)]">
                <span className="w-31 flex justify-between">
                  {r.hexParts.slice(0, 8).join(' ')}
                </span>
                <span className="text-[var(--text-tertiary)]/50 select-none">|</span>
                <span className="w-31 flex justify-between">
                  {r.hexParts.slice(8, 16).join(' ')}
                </span>
              </div>
              <span className="ml-4 text-teal-700 dark:text-teal-400 font-mono tracking-tight font-medium">
                {r.ascii}
              </span>
            </div>
          ))}

          {bytes.length > pageSize && (
            <div className="py-3 text-center text-xs text-[var(--text-tertiary)] italic">
              ... {bytes.length - pageSize} more bytes hidden. Click "Load +1024 bytes" to view more.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
