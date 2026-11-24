'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  FileText,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import type { WorkspaceState } from '@/lib/types/prdin';
import {
  buildMermaidFlowchart,
  compilePrdMarkdown,
  slugifyFilename,
} from '@/lib/export/markdown-exporter';
import { validateWorkspacePrd } from '@/lib/validation/prd-validator';
import { NativeModal } from '@/components/ui/NativeModal';

interface PrdDownloadModalProps {
  open: boolean;
  workspace: WorkspaceState;
  onClose: () => void;
  onOpenValidation?: () => void;
}

export function PrdDownloadModal({
  open,
  workspace,
  onClose,
  onOpenValidation,
}: PrdDownloadModalProps) {
  const [tab, setTab] = useState<'markdown' | 'mermaid' | 'validation'>('markdown');
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => compilePrdMarkdown(workspace), [workspace]);
  const mermaid = useMemo(
    () => buildMermaidFlowchart(workspace.nodes, workspace.edges),
    [workspace.nodes, workspace.edges]
  );
  const validation = useMemo(() => validateWorkspacePrd(workspace), [workspace]);
  const filename = useMemo(
    () => slugifyFilename(workspace.projectTitle),
    [workspace.projectTitle]
  );

  const validationText = useMemo(() => {
    const lines = [
      `Validasi PRD (${validation.purposeLabel}): ${validation.score}/100 - ${validation.statusLabel}`,
      `Ringkasan: ${validation.summary.passed} lolos, ${validation.summary.warnings} saran, ${validation.summary.failed} gagal`,
      '',
      ...validation.checks.map(
        (c) =>
          `- [${c.status.toUpperCase()}] ${c.title}: ${c.message}${c.suggestion ? ` (Saran: ${c.suggestion})` : ''}`
      ),
    ];
    return lines.join('\n');
  }, [validation]);

  const activeContent =
    tab === 'markdown' ? markdown : tab === 'mermaid' ? mermaid : validationText;

  const statusTone =
    validation.status === 'ready'
      ? 'border-[#38BDF8]/35 bg-[#38BDF8]/12 text-[#7DD3FC]'
      : validation.status === 'needs-improvement'
      ? 'border-amber-400/35 bg-amber-500/12 text-amber-300'
      : 'border-rose-400/35 bg-rose-500/12 text-rose-300';

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
          <h1 id="prd-export-title" className="text-base font-semibold text-white">
            Preview &amp; Download PRD
          </h1>
          <p className="mt-0.5 text-xs text-[#8C8C8C]">
            File <span className="font-mono font-medium text-[#93C5FD]">{filename}</span> berisi Plan Text lengkap, UX Research, diagram Mermaid, dan hasil validasi tujuan <span className="font-medium text-white">{validation.purposeLabel}</span>.
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

      {/* Purpose Validation Readiness Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#111115] px-6 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-[#60A5FA]" />
          <span className="text-[#D4D4D8]">
            Validasi Mode <strong className="text-white">{validation.purposeLabel}</strong>:
          </span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
            {validation.score}/100 · {validation.statusLabel}
          </span>
          <span className="text-[11px] text-[#8C8C8C]">
            ({validation.summary.passed} lolos · {validation.summary.warnings} saran · {validation.summary.failed} gagal)
          </span>
        </div>
        {onOpenValidation && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenValidation();
            }}
            className="rounded-lg border border-[#2F6BFF]/40 bg-[#2F6BFF]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93C5FD] hover:bg-[#2F6BFF]/25"
          >
            Periksa &amp; Perbaiki
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#121215] px-6 py-2.5">
        <div role="tablist" aria-label="Tampilan dokumen PRD" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'markdown'}
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
            role="tab"
            aria-selected={tab === 'mermaid'}
            onClick={() => setTab('mermaid')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === 'mermaid'
              ? 'bg-white text-[#0E0E0E]'
              : 'text-[#8C8C8C] hover:text-white'
              }`}
          >
            <FileCode2 className={`h-3.5 w-3.5 ${tab === 'mermaid' ? 'text-[#5A4CF5]' : ''}`} />
            Diagram Mermaid Saja
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'validation'}
            onClick={() => setTab('validation')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === 'validation'
              ? 'bg-white text-[#0E0E0E]'
              : 'text-[#8C8C8C] hover:text-white'
              }`}
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${tab === 'validation' ? 'text-[#2F6BFF]' : ''}`} />
            Validasi PRD ({validation.score}/100)
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

      {/* Preview Body */}
      <div className="prdin-scroll flex-1 overflow-y-auto bg-[#0A0A0D] p-5">
        {tab === 'validation' ? (
          <div className="space-y-2.5">
            {validation.checks.map((check) => (
              <div
                key={check.id}
                className="rounded-xl border border-white/[0.08] bg-[#141419] p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {check.status === 'pass' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : check.status === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <span className="font-semibold text-white">{check.title}</span>
                  </div>
                  <span className="rounded-md border border-white/[0.08] bg-[#1B1B22] px-2 py-0.5 text-[10px] font-medium text-[#A1A1AA]">
                    {check.categoryLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-[#D4D4D8]">{check.message}</p>
                {check.suggestion && check.status !== 'pass' && (
                  <p className="mt-1.5 text-[11px] text-[#93C5FD]">Saran: {check.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#D4D4D8]">
            {activeContent}
          </pre>
        )}
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
