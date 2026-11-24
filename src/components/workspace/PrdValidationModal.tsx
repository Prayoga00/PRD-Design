'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  FileText,
  Globe,
  PenTool,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import type { PrdPurpose, WorkspaceState } from '@/lib/types/prdin';
import { PRD_PURPOSE_OPTIONS } from '@/lib/constants/prd-purposes';
import {
  type PrdValidationCheck,
  validateWorkspacePrd,
} from '@/lib/validation/prd-validator';
import { NativeModal } from '@/components/ui/NativeModal';

interface PrdValidationModalProps {
  open: boolean;
  workspace: WorkspaceState;
  onClose: () => void;
  onFocusNode?: (nodeId: string) => void;
  onFixWithAi?: (prompt: string) => void;
  onChangeWorkspacePurpose?: (nextPurpose: PrdPurpose) => void;
  onOpenDownload?: () => void;
}

const PURPOSE_ICONS: Record<PrdPurpose, React.ComponentType<{ className?: string }>> = {
  'ui-ux-process': PenTool,
  application: Smartphone,
  website: Globe,
};

type FilterKind = 'all' | 'attention' | 'passed';

export function PrdValidationModal({
  open,
  workspace,
  onClose,
  onFocusNode,
  onFixWithAi,
  onChangeWorkspacePurpose,
  onOpenDownload,
}: PrdValidationModalProps) {
  const activePurpose = workspace.discovery?.prdPurpose ?? 'website';
  const [selectedRubricPurpose, setSelectedRubricPurpose] = useState<{
    projectId: string;
    purpose: PrdPurpose;
  } | null>(null);
  const [filter, setFilter] = useState<FilterKind>('all');

  const effectivePurpose =
    selectedRubricPurpose && selectedRubricPurpose.projectId === workspace.projectId
      ? selectedRubricPurpose.purpose
      : activePurpose;

  const handleClose = () => {
    setSelectedRubricPurpose(null);
    setFilter('all');
    onClose();
  };
  const validation = useMemo(
    () => validateWorkspacePrd(workspace, effectivePurpose),
    [workspace, effectivePurpose]
  );

  const filteredChecks = useMemo(() => {
    if (filter === 'attention') {
      return validation.checks.filter((c) => c.status !== 'pass');
    }
    if (filter === 'passed') {
      return validation.checks.filter((c) => c.status === 'pass');
    }
    return validation.checks;
  }, [validation.checks, filter]);

  const statusTone =
    validation.status === 'ready'
      ? {
          badge: 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#7DD3FC]',
          progress: 'iris-progress',
        }
      : validation.status === 'needs-improvement'
      ? {
          badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
          progress: 'iris-progress iris-progress-warn',
        }
      : {
          badge: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
          progress: 'iris-progress iris-progress-fail',
        };

  return (
    <NativeModal
      open={open}
      onClose={handleClose}
      titleId="prd-validation-title"
      className="w-[min(94vw,920px)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#60A5FA]" />
            <h1 id="prd-validation-title" className="text-base font-semibold text-white">
              Validasi Kelayakan PRD Berdasarkan Tujuan
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8C8C8C]">
            Pemeriksaan struktur inti PRD &amp; standar khusus untuk mode{' '}
            <span className="font-semibold text-[#D4D4D8]">UI / UX Proses</span>,{' '}
            <span className="font-semibold text-[#D4D4D8]">Website</span>, dan{' '}
            <span className="font-semibold text-[#D4D4D8]">Aplikasi</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup modal validasi PRD"
          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1.5 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Purpose Rubric Switcher */}
      <div className="border-b border-white/[0.08] bg-[#121215] px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Pilih standar validasi tujuan PRD"
            className="inline-flex flex-wrap items-center gap-1.5"
          >
            {PRD_PURPOSE_OPTIONS.map((option) => {
              const Icon = PURPOSE_ICONS[option.id];
              const isSelected = effectivePurpose === option.id;
              const isProjectMode = activePurpose === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() =>
                    setSelectedRubricPurpose({
                      projectId: workspace.projectId,
                      purpose: option.id,
                    })
                  }
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-white text-[#0E0E0E]'
                      : 'border border-white/[0.08] bg-[#1A1A20] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#2F6BFF]' : ''}`} />
                  <span>{option.label}</span>
                  {isProjectMode && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isSelected
                          ? 'bg-[#2F6BFF]/15 text-[#2F6BFF]'
                          : 'bg-[#2F6BFF]/20 text-[#93C5FD]'
                      }`}
                    >
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {effectivePurpose !== activePurpose && onChangeWorkspacePurpose && (
            <button
              type="button"
              onClick={() => {
                onChangeWorkspacePurpose(effectivePurpose);
                setSelectedRubricPurpose(null);
              }}
              className="rounded-lg border border-[#2F6BFF]/45 bg-[#2F6BFF]/15 px-3 py-1.5 text-xs font-semibold text-[#93C5FD] hover:bg-[#2F6BFF]/25"
            >
              Terapkan Mode {validation.purposeLabel} ke Proyek
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="prdin-scroll flex-1 space-y-4 overflow-y-auto bg-[#0D0D10] p-6">
        {/* Scorecard */}
        <section
          aria-labelledby="prd-score-heading"
          className="rounded-2xl border border-white/[0.08] bg-[#151519] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p id="prd-score-heading" className="text-xs font-medium text-[#8C8C8C]">
                Skor Kesiapan PRD · Standar{' '}
                <strong className="text-white">{validation.purposeLabel}</strong>
              </p>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="text-2xl font-bold tracking-tight text-white">
                  {validation.score}
                  <span className="text-sm font-medium text-[#6E6E6E]">/100</span>
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone.badge}`}
                >
                  {validation.statusLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {validation.summary.passed} Lolos
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                {validation.summary.warnings} Saran
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 font-medium text-rose-300">
                <XCircle className="h-3.5 w-3.5" />
                {validation.summary.failed} Gagal
              </span>
            </div>
          </div>

          <div className="mt-3">
            <progress
              aria-labelledby="prd-score-heading"
              value={validation.score}
              max={100}
              className={`${statusTone.progress} h-2 w-full`}
            />
          </div>
        </section>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all' as const, label: `Semua (${validation.checks.length})` },
              {
                id: 'attention' as const,
                label: `Perlu Perhatian (${validation.summary.warnings + validation.summary.failed})`,
              },
              { id: 'passed' as const, label: `Lolos (${validation.summary.passed})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`min-h-7 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === item.id
                    ? 'bg-[#2F6BFF]/25 text-white ring-1 ring-[#2F6BFF]/50'
                    : 'bg-[#18181D] text-[#8C8C8C] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#6E6E6E]">
            Klik tiap kriteria untuk melihat detail &amp; perbaikan cepat.
          </span>
        </div>

        {/* Validation Checklist (Native <details> without headings inside <summary>) */}
        <div className="space-y-2.5">
          {filteredChecks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/[0.1] p-6 text-center text-xs text-[#8C8C8C]">
              Tidak ada item pada filter ini.
            </p>
          ) : (
            filteredChecks.map((check) => (
              <ValidationCheckItem
                key={check.id}
                check={check}
                defaultOpen={check.status !== 'pass'}
                onFocusNode={onFocusNode}
                onFixWithAi={onFixWithAi}
                onClose={handleClose}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#151518] px-6 py-4">
        <p className="text-xs text-[#8C8C8C]">
          Validasi diperbarui otomatis setiap kali Canvas, Plan Text, atau Roadmap diubah.
        </p>
        <div className="flex items-center gap-2">
          {onOpenDownload && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenDownload();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#1D1D22] px-4 py-2 text-xs font-semibold text-[#D4D4D8] hover:bg-white/[0.08]"
            >
              <FileText className="h-3.5 w-3.5 text-[#60A5FA]" />
              Preview &amp; Download (.md)
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={handleClose}
            className="iris-btn-gradient rounded-xl px-4 py-2 text-xs font-semibold"
          >
            Selesai
          </button>
        </div>
      </div>
    </NativeModal>
  );
}

interface ValidationCheckItemProps {
  check: PrdValidationCheck;
  defaultOpen: boolean;
  onFocusNode?: (nodeId: string) => void;
  onFixWithAi?: (prompt: string) => void;
  onClose: () => void;
}

function ValidationCheckItem({
  check,
  defaultOpen,
  onFocusNode,
  onFixWithAi,
  onClose,
}: ValidationCheckItemProps) {
  const badgeClass =
    check.status === 'pass'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : check.status === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-300';

  const statusText =
    check.status === 'pass' ? 'Lolos' : check.status === 'warning' ? 'Saran' : 'Perlu Perbaikan';

  return (
    <details
      open={defaultOpen}
      className="iris-details rounded-xl border border-white/[0.08] bg-[#151519] transition-colors open:border-white/[0.14]"
    >
      <summary className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <ChevronRight className="iris-details-chevron h-3.5 w-3.5 shrink-0 text-[#8C8C8C]" />
          {check.status === 'pass' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : check.status === 'warning' ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span className="truncate text-xs font-semibold text-white">{check.title}</span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-md border border-white/[0.07] bg-[#1C1C22] px-2 py-0.5 text-[10px] font-medium text-[#A1A1AA]">
            {check.categoryLabel}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
            {statusText}
          </span>
        </span>
      </summary>

      <div className="space-y-2 border-t border-white/[0.06] px-4 py-3 text-xs">
        <p className="text-[#8C8C8C]">{check.description}</p>
        <p className="font-medium text-[#E4E4E7]">{check.message}</p>
        {check.suggestion && check.status !== 'pass' && (
          <p className="rounded-lg border border-[#2F6BFF]/25 bg-[#2F6BFF]/10 px-3 py-2 text-[11px] text-[#BFDBFE]">
            <strong className="text-white">Rekomendasi:</strong> {check.suggestion}
          </p>
        )}

        {check.status !== 'pass' && (check.affectedNodeIds?.length || check.aiFixPrompt) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {check.affectedNodeIds && check.affectedNodeIds.length > 0 && onFocusNode && (
              <button
                type="button"
                onClick={() => {
                  onFocusNode(check.affectedNodeIds![0]);
                  onClose();
                }}
                className="inline-flex min-h-7 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1D1D24] px-2.5 py-1 text-[11px] font-semibold text-[#D4D4D8] hover:border-[#2F6BFF]/60 hover:text-white"
              >
                <Crosshair className="h-3 w-3 text-[#60A5FA]" />
                Sorot Node di Canvas
              </button>
            )}

            {check.aiFixPrompt && onFixWithAi && (
              <button
                type="button"
                onClick={() => {
                  onFixWithAi(check.aiFixPrompt!);
                  onClose();
                }}
                className="iris-btn-gradient inline-flex min-h-7 items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold"
              >
                <Sparkles className="h-3 w-3" />
                Lengkapi Otomatis via Chat AI
              </button>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
