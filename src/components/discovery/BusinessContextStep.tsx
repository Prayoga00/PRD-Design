'use client';

import React, { useId, useState } from 'react';
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Eraser,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { PrdBusinessContext, PrdPurpose } from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';

interface BusinessContextStepProps {
  prdPurpose: PrdPurpose;
  value: PrdBusinessContext;
  onChange: (next: PrdBusinessContext) => void;
  onApplyPreset: () => void;
  onClear: () => void;
}

type FieldKey = keyof PrdBusinessContext;

interface FieldMeta {
  key: FieldKey;
  label: string;
  hint: string;
  placeholder: string;
  examplesKey:
    | 'successMetricsExamples'
    | 'userRolesExamples'
    | 'nonGoalsExamples'
    | 'technicalConstraintsExamples';
}

const FIELD_DEFS: FieldMeta[] = [
  {
    key: 'successMetrics',
    label: '1. Target KPI & Ukuran Sukses Bisnis',
    hint: 'Tulis target angka yang membuktikan produk berhasil secara bisnis (konversi, waktu selesai, atau retensi).',
    placeholder: 'Contoh: Konversi pengunjung >= 8%; selesai checkout dalam <= 3 menit.',
    examplesKey: 'successMetricsExamples',
  },
  {
    key: 'userRolesAndRules',
    label: '2. Peran Aktor (Role) & Aturan Bisnis Utama',
    hint: 'Jelaskan perbedaan hak akses antar aktor dan aturan operasional penting (misal batas batal, approval).',
    placeholder: 'Contoh: Pengunjung publik vs Admin; pembatalan jadwal maksimal H-1.',
    examplesKey: 'userRolesExamples',
  },
  {
    key: 'nonGoals',
    label: '3. Batasan Scope / Non-Goals (Apa yang Ditunda)',
    hint: 'Tentukan fitur yang sengaja TIDAK dikerjakan pada rilis awal agar tim fokus dan jadwal aman.',
    placeholder: 'Contoh: Belum membuat aplikasi native iOS/Android dan integrasi ERP eksternal di v1.',
    examplesKey: 'nonGoalsExamples',
  },
  {
    key: 'technicalConstraints',
    label: '4. Batasan Proyek & Spesifikasi Teknis (NFR)',
    hint: 'Cantumkan standar desain/teknis wajib seperti responsif, performa, SEO, keamanan, atau handoff Figma.',
    placeholder: 'Contoh: Mobile-first 375px, LCP <= 2.5 detik, WCAG AA >= 4.5:1.',
    examplesKey: 'technicalConstraintsExamples',
  },
];

function appendExampleChip(current: string, chip: string): string {
  const trimmed = current.trim();
  if (!trimmed) return chip;
  if (trimmed.toLowerCase().includes(chip.toLowerCase())) return current;
  const separator = /[.!?;\n]$/.test(trimmed) ? ' ' : '; ';
  return `${trimmed}${separator}${chip}`;
}

export function BusinessContextStep({
  prdPurpose,
  value,
  onChange,
  onApplyPreset,
  onClear,
}: BusinessContextStepProps) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];
  const presets = purposeMeta.businessPresets;

  const filledCount = FIELD_DEFS.filter((f) => value[f.key].trim().length >= 8).length;
  const [isExpanded, setIsExpanded] = useState(filledCount > 0);

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#151518] p-5 transition-colors">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#7DD3FC]">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-white">
            Detail Bisnis &amp; Standar PRD ({purposeMeta.label})
          </h3>
          <span className="rounded-full border border-white/[0.08] bg-[#1B1B20] px-2 py-0.5 text-[10px] font-semibold text-[#8C8C8C]">
            Opsional · Disarankan
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onApplyPreset();
              setIsExpanded(true);
            }}
            className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[#2F6BFF]/45 bg-[#2F6BFF]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#93C5FD] transition-colors hover:bg-[#2F6BFF]/25 hover:text-white"
          >
            <Sparkles className="h-3 w-3" />
            Isi Rekomendasi Otomatis
          </button>

          {filledCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-white/[0.08] bg-[#1B1B20] px-2.5 py-0.5 text-[11px] font-medium text-[#8C8C8C] hover:text-white"
            >
              <Eraser className="h-3 w-3" />
              Kosongkan
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              filledCount === 4
                ? 'border border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                : filledCount > 0
                ? 'border border-[#38BDF8]/35 bg-[#38BDF8]/15 text-[#7DD3FC]'
                : 'border border-white/[0.08] bg-[#1D1D22] text-[#8C8C8C]'
            }`}
          >
            {filledCount === 4 && <CheckCircle2 className="h-3 w-3" />}
            {filledCount}/4 terisi
          </span>

          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={panelId}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex min-h-7 items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1B1B20] px-2.5 py-1 text-[11px] font-semibold text-[#D4D4D8] hover:border-white/20 hover:text-white"
          >
            <span>{isExpanded ? 'Tutup' : 'Lengkapi'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-[#8C8C8C]">
        Lengkapi target KPI bisnis, role/aturan bisnis, batasan Non-Goals, dan spesifikasi teknis agar PRD yang dihasilkan langsung memenuhi standar tim engineering, desain, dan bisnis.
      </p>

      {/* Expandable Form Controls */}
      {isExpanded && (
        <div id={panelId} className="mt-4 space-y-5 border-t border-white/[0.08] pt-4">
          {FIELD_DEFS.map((field) => {
            const inputId = `${baseId}-${field.key}`;
            const hintId = `${baseId}-${field.key}-hint`;
            const examples = presets[field.examplesKey];

            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-xs font-semibold text-white">
                  {field.label}
                </label>
                <p id={hintId} className="text-[11px] leading-relaxed text-[#8C8C8C]">
                  {field.hint}
                </p>
                <textarea
                  id={inputId}
                  name={field.key}
                  rows={2}
                  enterKeyHint="next"
                  aria-describedby={hintId}
                  value={value[field.key]}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [field.key]: e.target.value,
                    })
                  }
                  placeholder={field.placeholder}
                  className="mt-0.5 w-full rounded-xl border border-white/[0.1] bg-[#101014] px-3 py-2 text-base text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25 sm:text-xs"
                />

                {/* 1-Click Examples tailored to active PrdPurpose */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-medium text-[#6E6E6E]">Contoh cepat:</span>
                  {examples.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...value,
                          [field.key]: appendExampleChip(value[field.key], chip),
                        })
                      }
                      className="inline-flex min-h-6 items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1A1A20] px-2 py-0.5 text-left text-[11px] text-[#D4D4D8] transition-colors hover:border-[#2F6BFF]/50 hover:bg-[#2F6BFF]/15 hover:text-white"
                    >
                      <Plus className="h-2.5 w-2.5 shrink-0 text-[#60A5FA]" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
