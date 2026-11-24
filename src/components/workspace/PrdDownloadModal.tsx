'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, FileText, X } from 'lucide-react';
import type { WorkspaceState } from '@/lib/types/prdin';
import {
  buildMermaidFlowchart,
  compilePrdMarkdown,
  slugifyFilename,
} from '@/lib/export/markdown-exporter';
import { NativeModal } from '@/components/ui/NativeModal';

interface PrdDownloadModalProps {
  open: boolean;
  workspace: WorkspaceState;
  onClose: () => void;
}

export function PrdDownloadModal({ open, workspace, onClose }: PrdDownloadModalProps) {
  const [tab, setTab] = useState<'markdown' | 'mermaid'>('markdown');
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => compilePrdMarkdown(workspace), [workspace]);
  const mermaid = useMemo(
    () => buildMermaidFlowchart(workspace.nodes, workspace.edges),
    [workspace.nodes, workspace.edges]
  );
  const filename = useMemo(
    () => slugifyFilename(workspace.projectTitle),
    [workspace.projectTitle]
  );

  const activeContent = tab === 'markdown' ? markdown : mermaid;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <NativeModal open={open} onClose={onClose} titleId="prd-export-title">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
        <div>
          <h2 id="prd-export-title" className="text-base font-semibold text-white">
            Preview &amp; Download PRD
          </h2>
          <p className="mt-0.5 text-xs text-[#8C8C8C]">
            File <span className="font-mono font-medium text-[#93C5FD]">{filename}</span> berisi Plan Text lengkap, UX Research, dan diagram Mermaid dari Canvas.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup modal download PRD"
          className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#121215] px-6 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('markdown')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === 'markdown'
              ? 'bg-white text-[#0E0E0E]'
              : 'text-[#8C8C8C] hover:text-white'
              }`}
          >
            <FileText className={`h-3.5 w-3.5 ${tab === 'markdown' ? 'text-[#2F6BFF]' : ''}`} />
            Full PRD (.md)
          </button>
          <button
            type="button"
            onClick={() => setTab('mermaid')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === 'mermaid'
              ? 'bg-white text-[#0E0E0E]'
              : 'text-[#8C8C8C] hover:text-white'
              }`}
          >
            <FileCode2 className={`h-3.5 w-3.5 ${tab === 'mermaid' ? 'text-[#5A4CF5]' : ''}`} />
            Diagram Mermaid Saja
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1D1D22] px-3 py-1.5 text-xs font-medium text-[#D4D4D8] hover:bg-white/[0.08]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#60A5FA]" />
              Tersalin
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Salin Teks
            </>
          )}
        </button>
      </div>

      {/* Code Preview */}
      <div className="prdin-scroll flex-1 overflow-y-auto bg-[#0A0A0D] p-5">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#D4D4D8]">
          {activeContent}
        </pre>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#151518] px-6 py-4">
        <p className="text-xs text-[#8C8C8C]">
          Siap dibuka di Notion, GitHub, VS Code, atau langsung dipakai sebagai brief ke developer/AI.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] bg-[#1D1D22] px-4 py-2 text-xs font-semibold text-[#D4D4D8] hover:bg-white/[0.08]"
          >
            Tutup
          </button>
          <button
            type="button"
            autoFocus
            onClick={handleDownload}
            className="iris-btn-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            Download {filename}
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
