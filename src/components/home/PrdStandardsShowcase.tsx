'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Globe,
  Layers,
  PenTool,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { PrdPurpose, WorkspaceState } from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP, PRD_PURPOSE_OPTIONS } from '@/lib/constants/prd-purposes';
import { validateWorkspacePrd } from '@/lib/validation/prd-validator';

interface PrdStandardsShowcaseProps {
  workspace: WorkspaceState | null;
  onStartWithPurpose: (purpose: PrdPurpose) => void;
  onOpenWorkspaceValidation?: () => void;
}

const PURPOSE_ICONS: Record<PrdPurpose, React.ComponentType<{ className?: string }>> = {
  'ui-ux-process': PenTool,
  application: Smartphone,
  website: Globe,
};

const PRD_STRUCTURE_SECTIONS = [
  {
    step: '01',
    title: 'Executive Summary & KPI',
    desc: 'Problem Statement, Proposed Solution, dan 3–5 target KPI terukur.',
  },
  {
    step: '02',
    title: 'UX Research & Aturan Bisnis',
    desc: 'Target persona, pain point, aktor/role, hak akses, dan value/retention loop.',
  },
  {
    step: '03',
    title: 'Flow Kerja Bisnis (Mermaid)',
    desc: 'Diagram alur visual dari pintu masuk, fitur inti, validasi, hingga hasil akhir.',
  },
  {
    step: '04',
    title: 'Spesifikasi Tahap & NFR',
    desc: 'User Story, komponen UI, Acceptance Criteria terukur, Edge Cases & spesifikasi teknis.',
  },
  {
    step: '05',
    title: 'Non-Goals & Risks',
    desc: 'Batasan tegas MVP agar bebas scope creep beserta antisipasi risiko.',
  },
  {
    step: '06',
    title: 'Roadmap & Validasi PRD',
    desc: 'Daftar task kanban & skor kelayakan otomatis sesuai tujuan produk.',
  },
];

const PURPOSE_VALIDATION_CRITERIA: Record<
  PrdPurpose,
  Array<{ title: string; level: 'Wajib' | 'Saran'; detail: string }>
> = {
  'ui-ux-process': [
    {
      title: 'Fondasi Riset UX & Problem Framing',
      level: 'Wajib',
      detail: 'Audit alur lama, titik friction, user interview, atau Information Architecture.',
    },
    {
      title: 'Artefak User Flow, Wireframe & Prototype',
      level: 'Wajib',
      detail: 'Setiap tahap mencantumkan minimal 2 artefak UI/Figma konkret.',
    },
    {
      title: 'Kelengkapan 4 State Layar',
      level: 'Saran',
      detail: 'Normal/Default, Loading Skeleton, Empty State, dan Error State terdokumentasi.',
    },
    {
      title: 'Gerbang Usability Testing & Design Review',
      level: 'Wajib',
      detail: 'Skenario uji pengguna & kriteria lolos sebelum masuk ke developer.',
    },
    {
      title: 'Developer Handoff, Design System & WCAG',
      level: 'Saran',
      detail: 'Token desain 8pt grid, microcopy, kontras >= 4.5:1, dan tap target >= 44x44px.',
    },
  ],
  website: [
    {
      title: 'Landing Entry, Value Proposition & CTA',
      level: 'Wajib',
      detail: 'Pengunjung langsung paham nilai utama & tombol aksi sejak layar pertama.',
    },
    {
      title: 'Struktur Halaman & Navigasi Konten',
      level: 'Wajib',
      detail: 'Alur antar halaman/section terhubung utuh tanpa jalan buntu.',
    },
    {
      title: 'Alur Konversi, Validasi Input & Konfirmasi',
      level: 'Wajib',
      detail: 'Verifikasi form, penanganan input gagal, dan layar konfirmasi hasil.',
    },
    {
      title: 'Responsif Mobile, SEO & Performa Web',
      level: 'Saran',
      detail: 'Viewport 375px–1440px, tag SEO/Open Graph, serta target LCP <= 2.5 detik.',
    },
    {
      title: 'Mekanisme Kunjungan Ulang',
      level: 'Saran',
      detail: 'Alasan pengunjung kembali (riwayat, notifikasi WA/email, atau bookmark).',
    },
  ],
  application: [
    {
      title: 'Onboarding Pertama & Akses Awal',
      level: 'Wajib',
      detail: 'Pengalaman buka pertama (Guest Mode / 1-Tap Login) & penanganan data kosong.',
    },
    {
      title: 'Kelengkapan Modul Inti, Aktor & Layar',
      level: 'Wajib',
      detail: 'Setiap modul memiliki aktor/role jelas, User Story, dan >= 2 komponen UI.',
    },
    {
      title: 'System State, Offline & Error Recovery',
      level: 'Wajib',
      detail: 'Loading skeleton, empty state, koneksi putus/timeout, serta aksi retry aman.',
    },
    {
      title: 'Integrasi API/Data, Keamanan & Performa',
      level: 'Saran',
      detail: 'Kontrak API/storage, autentikasi/hak akses, dan response time <= 300ms.',
    },
    {
      title: 'Mekanisme Retensi & Pengingat Aktif',
      level: 'Saran',
      detail: 'Riwayat tersimpan, sinkronisasi data, dan notifikasi berkala.',
    },
  ],
};

export function PrdStandardsShowcase({
  workspace,
  onStartWithPurpose,
  onOpenWorkspaceValidation,
}: PrdStandardsShowcaseProps) {
  const [activePurpose, setActivePurpose] = useState<PrdPurpose>(
    workspace?.discovery?.prdPurpose ?? 'ui-ux-process'
  );

  const purposeMeta = PRD_PURPOSE_MAP[activePurpose];
  const criteria = PURPOSE_VALIDATION_CRITERIA[activePurpose];
  const presets = purposeMeta.businessPresets;

  const liveValidation = useMemo(
    () => (workspace ? validateWorkspacePrd(workspace) : null),
    [workspace]
  );

  return (
    <section aria-labelledby="prd-standards-heading" className="space-y-6">
      {/* Live Workspace Validation Banner if user already has an active project */}
      {workspace && liveValidation && (
        <div className="rounded-2xl border border-[#2F6BFF]/35 bg-[#131622] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#60A5FA]" />
                <span className="text-xs font-semibold text-white">
                  Proyek Aktif: {workspace.projectTitle}
                </span>
                <span className="rounded-full border border-[#38BDF8]/35 bg-[#38BDF8]/15 px-2 py-0.5 text-[10px] font-semibold text-[#7DD3FC]">
                  Mode {liveValidation.purposeLabel}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Skor validasi PRD saat ini:{' '}
                <strong className="text-white">{liveValidation.score}/100</strong> (
                {liveValidation.statusLabel} · {liveValidation.summary.passed} lolos,{' '}
                {liveValidation.summary.warnings} saran, {liveValidation.summary.failed} gagal).
              </p>
            </div>

            {onOpenWorkspaceValidation && (
              <button
                type="button"
                onClick={onOpenWorkspaceValidation}
                className="iris-btn-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Periksa Validasi PRD
              </button>
            )}
          </div>
          <div className="mt-3">
            <progress
              aria-label={`Skor validasi proyek ${workspace.projectTitle}`}
              value={liveValidation.score}
              max={100}
              className={`h-2 w-full ${
                liveValidation.status === 'ready'
                  ? 'iris-progress'
                  : liveValidation.status === 'needs-improvement'
                  ? 'iris-progress iris-progress-warn'
                  : 'iris-progress iris-progress-fail'
              }`}
            />
          </div>
        </div>
      )}

      {/* 1. Standard PRD Structure Overview */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#151518] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#2F6BFF]" />
              <h2 id="prd-standards-heading" className="text-sm font-semibold text-white">
                Struktur PRD Standar Produksi di PRDin
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#8C8C8C]">
              Setiap PRD yang dihasilkan memadukan alur Q1–Q5 dan Detail Bisnis menjadi dokumen 7 bagian yang siap dieksekusi tim.
            </p>
          </div>
          <span className="rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-2.5 py-1 text-[11px] font-semibold text-[#7DD3FC]">
            Terukur &amp; Bebas Ambigu
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRD_STRUCTURE_SECTIONS.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-white/[0.07] bg-[#19191E] p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#2F6BFF]/20 font-mono text-[10px] font-bold text-[#93C5FD]">
                  {item.step}
                </span>
                <h3 className="text-xs font-semibold text-white">{item.title}</h3>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8C8C8C]">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Concrete vs Ambiguous Quality Standard Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#101014]">
          <table className="w-full min-w-[520px] text-left text-xs">
            <caption className="sr-only">
              Perbandingan penulisan requirement PRD yang ambigu vs terukur
            </caption>
            <thead className="border-b border-white/[0.08] bg-[#16161B] text-[11px] text-[#A1A1AA]">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Hindari (Kata Subjektif / Ambigu)
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold text-[#7DD3FC]">
                  Standar PRDin (Terukur &amp; Dapat Diuji)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-[11px]">
              <tr>
                <td className="px-4 py-2.5 text-[#8C8C8C]">
                  &ldquo;Checkout harus cepat dan mudah digunakan.&rdquo;
                </td>
                <td className="px-4 py-2.5 text-[#E4E4E7]">
                  &ldquo;Checkout selesai dalam &lt;= 3 langkah dengan waktu konfirmasi &lt;= 2 detik.&rdquo;
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-[#8C8C8C]">
                  &ldquo;Desain harus modern dan ramah di HP.&rdquo;
                </td>
                <td className="px-4 py-2.5 text-[#E4E4E7]">
                  &ldquo;Responsif 375px–1440px, kontras WCAG AA &gt;= 4.5:1, tap target &gt;= 44x44px.&rdquo;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Purpose-Based Validation Matrix */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#151518] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-[#5A4CF5]" />
              <h2 className="text-sm font-semibold text-white">
                Matriks Validasi PRD Berdasarkan 3 Tujuan
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#8C8C8C]">
              Pilih tujuan di bawah untuk melihat kriteria validasi khusus dan standar KPI bisnis yang dicek otomatis.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Pilih tujuan PRD untuk melihat standar validasi"
            className="inline-flex flex-wrap gap-1.5 rounded-xl border border-white/[0.08] bg-[#101014] p-1"
          >
            {PRD_PURPOSE_OPTIONS.map((opt) => {
              const Icon = PURPOSE_ICONS[opt.id];
              const isSelected = activePurpose === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActivePurpose(opt.id)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-white text-[#0E0E0E]'
                      : 'text-[#8C8C8C] hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#2F6BFF]' : ''}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Criteria List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-[#D4D4D8]">
              5 Kriteria Validasi Khusus Mode {purposeMeta.label}
            </h3>
            {criteria.map((item) => (
              <div
                key={item.title}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#19191E] p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  {item.level === 'Wajib' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">{item.title}</div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#8C8C8C]">
                      {item.detail}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    item.level === 'Wajib'
                      ? 'border-[#2F6BFF]/40 bg-[#2F6BFF]/15 text-[#93C5FD]'
                      : 'border-amber-400/35 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {item.level}
                </span>
              </div>
            ))}
          </div>

          {/* Standard Business Context Preset Preview */}
          <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#101014] p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7DD3FC]">
                <Sparkles className="h-3.5 w-3.5" />
                Standar Bisnis Bawaan ({purposeMeta.label})
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="rounded-lg border border-white/[0.06] bg-[#17171D] p-2.5">
                  <div className="font-semibold text-white">Target KPI Bisnis</div>
                  <p className="mt-0.5 text-[#A1A1AA]">{presets.defaultPreset.successMetrics}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-[#17171D] p-2.5">
                  <div className="font-semibold text-white">Peran Aktor &amp; Aturan</div>
                  <p className="mt-0.5 text-[#A1A1AA]">{presets.defaultPreset.userRolesAndRules}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-[#17171D] p-2.5">
                  <div className="font-semibold text-white">Non-Goals MVP</div>
                  <p className="mt-0.5 text-[#A1A1AA]">{presets.defaultPreset.nonGoals}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-[#17171D] p-2.5">
                  <div className="font-semibold text-white">Batasan Teknis &amp; NFR</div>
                  <p className="mt-0.5 text-[#A1A1AA]">
                    {presets.defaultPreset.technicalConstraints}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartWithPurpose(activePurpose)}
              className="iris-btn-gradient mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
            >
              <span>Mulai Buat &amp; Validasi PRD ({purposeMeta.label})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
