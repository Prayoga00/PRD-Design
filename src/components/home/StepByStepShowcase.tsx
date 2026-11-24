'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Check,
  Download,
  FileText,
  GitBranch,
  Layers,
  Pause,
  Play,
  Sparkles,
  Tag,
} from 'lucide-react';

interface WalkthroughStep {
  id: number;
  shortTitle: string;
  badge: string;
  title: string;
  description: string;
}

const STEPS: WalkthroughStep[] = [
  {
    id: 0,
    shortTitle: '1. Pilih Tujuan & Cerita Q1',
    badge: 'Langkah 1 · Ask PRD',
    title: 'Pilih tujuan PRD lalu ceritakan 1 pengguna lewat Chat AI',
    description:
      'Tentukan apakah PRD untuk UI / UX Proses, Aplikasi, atau Website. Cerita singkatmu di Pertanyaan 1 langsung dipahami AI.',
  },
  {
    id: 1,
    shortTitle: '2. Tag Adaptif Q2–Q5',
    badge: 'Langkah 2 · Hydrate Tag',
    title: 'Pilihan tag di Pertanyaan 2–5 otomatis menyesuaikan cerita',
    description:
      'Tinggal klik tag relevan (plus tombol Other untuk input manual) agar langkah awal, 3 fitur wajib, value hook, dan retensi terkunci rapi.',
  },
  {
    id: 2,
    shortTitle: '3. Workspace 3-Kolom',
    badge: 'Langkah 3 · Visual Studio',
    title: 'Plan Text, Canvas Zoomable, dan Chat AI bekerja sinkron',
    description:
      'Canvas tengah menampilkan UX Research & Struktur Flow Kerja Bisnis. Klik node untuk melihat detailnya di Plan Text kiri, atau ubah lewat Chat AI kanan.',
  },
  {
    id: 3,
    shortTitle: '4. Download PRD (.md)',
    badge: 'Langkah 4 · Siap Eksekusi',
    title: 'Ekspor dokumen PRD utuh lengkap dengan diagram Mermaid',
    description:
      'Unduh spesifikasi terstruktur yang siap dibagikan ke developer, klien, atau AI coding assistant dalam format Markdown.',
  },
];

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StepByStepShowcase() {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const [activeStep, setActiveStep] = useState(0);
  const [userPaused, setUserPaused] = useState(false);

  const isPlaying = !prefersReducedMotion && !userPaused;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const current = STEPS[activeStep];

  return (
    <section
      aria-labelledby="showcase-heading"
      className="rounded-2xl border border-white/[0.08] bg-[#151518] p-5 sm:p-7"
    >
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h2 id="showcase-heading" className="text-sm font-semibold text-white">
            Alur Pembuatan PRD Step-by-Step
          </h2>
          <p className="text-xs text-[#8C8C8C]">
            Klik langkah di bawah atau biarkan berjalan otomatis untuk melihat cara kerja PRDin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUserPaused((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1C1C22] px-3 py-1.5 text-xs font-semibold text-[#D4D4D8] transition-colors hover:bg-white/[0.08]"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              Jeda
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Putar
            </>
          )}
        </button>
      </div>

      {/* Step Selector Pills */}
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STEPS.map((step) => {
          const active = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                setActiveStep(step.id);
                setUserPaused(true);
              }}
              aria-current={active ? 'step' : undefined}
              className={`relative overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                active
                  ? 'border-[#2F6BFF]/60 bg-[#2F6BFF]/15 text-white'
                  : 'border-white/[0.08] bg-[#19191E] text-[#8C8C8C] hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="block text-xs font-semibold">{step.shortTitle}</span>
              <span
                className="mt-2 block h-1 w-full origin-left rounded-full transition-transform duration-300"
                style={{
                  transform: active ? 'scaleX(1)' : 'scaleX(0.18)',
                  background: active
                    ? 'linear-gradient(90deg, #2F6BFF, #5A4CF5)'
                    : 'rgba(255,255,255,0.12)',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Stage Frame */}
      <div className="mt-5 grid grid-cols-1 gap-6 rounded-2xl border border-white/[0.08] bg-[#101014] p-5 lg:grid-cols-[1fr_1.35fr] lg:items-center">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6BFF]/35 bg-[#2F6BFF]/15 px-3 py-1 text-xs font-semibold text-[#93C5FD]">
            <Sparkles className="h-3.5 w-3.5" />
            {current.badge}
          </span>
          <h3 className="text-xl font-medium leading-snug text-white">{current.title}</h3>
          <p className="text-sm leading-relaxed text-[#8C8C8C]">{current.description}</p>

          <div className="pt-2">
            <Link
              href="/ask"
              className="iris-btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
            >
              Coba Langkah Ini di Ask PRD
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#16161B] p-4">
          {activeStep === 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {['UI / UX Proses', 'Aplikasi', 'Website'].map((mode, idx) => (
                  <span
                    key={mode}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      idx === 0
                        ? 'border border-[#2F6BFF]/45 bg-[#2F6BFF]/20 text-white'
                        : 'bg-white/[0.06] text-[#8C8C8C]'
                    }`}
                  >
                    {mode}
                  </span>
                ))}
              </div>
              <div className="iris-btn-gradient rounded-xl p-3 text-xs leading-relaxed text-white">
                &ldquo;Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja lokal agar langkah bayar lebih ringkas.&rdquo;
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#7DD3FC]">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Bot className="h-3.5 w-3.5" />
                  Terdeteksi: Redesign Checkout · Mode UI / UX Proses
                </span>
                <span className="font-medium">Q2–Q5 sinkron</span>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <Tag className="h-3.5 w-3.5 text-[#2F6BFF]" />
                  Pertanyaan 3 · 3 Artefak UI/UX Wajib
                </span>
                <span className="rounded-full bg-[#2F6BFF]/20 px-2 py-0.5 text-[11px] font-semibold text-[#93C5FD]">
                  3/3 dipilih
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Persona & Problem Board', active: true },
                  { label: 'End-to-End User Flow', active: true },
                  { label: 'Wireframe 4 State', active: true },
                  { label: 'Interactive Prototype', active: false },
                  { label: '+ Other (Input Manual)', active: false },
                ].map((tag) => (
                  <span
                    key={tag.label}
                    className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
                      tag.active
                        ? 'border-[#2F6BFF]/60 bg-[#2F6BFF]/20 text-white'
                        : 'border-dashed border-white/[0.14] bg-[#1C1C22] text-[#8C8C8C]'
                    }`}
                  >
                    {tag.active && <Check className="h-3 w-3 text-[#60A5FA]" />}
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid grid-cols-3 gap-2.5 text-[11px]">
              <div className="rounded-xl border border-[#2F6BFF]/35 bg-[#2F6BFF]/10 p-2.5">
                <div className="flex items-center gap-1 font-bold text-white">
                  <FileText className="h-3 w-3 text-[#60A5FA]" />
                  Plan Text
                </div>
                <p className="mt-1.5 text-[#8C8C8C]">
                  Tujuan tahap, komponen UI Figma, User Story &amp; Edge Cases.
                </p>
              </div>
              <div className="rounded-xl border border-[#38BDF8]/30 bg-[#38BDF8]/10 p-2.5">
                <div className="flex items-center gap-1 font-bold text-white">
                  <GitBranch className="h-3 w-3 text-[#7DD3FC]" />
                  Canvas Zoom
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="rounded bg-[#11141B] px-1.5 py-0.5 text-[10px] font-medium text-[#7DD3FC] ring-1 ring-[#38BDF8]/30">
                    UX Research
                  </div>
                  <div className="rounded bg-[#11141B] px-1.5 py-0.5 text-[10px] font-medium text-[#93C5FD] ring-1 ring-[#2F6BFF]/30">
                    Flow Kerja
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#5A4CF5]/35 bg-[#5A4CF5]/10 p-2.5">
                <div className="flex items-center gap-1 font-bold text-white">
                  <Layers className="h-3 w-3 text-[#C4B5FD]" />
                  Chat AI
                </div>
                <p className="mt-1.5 text-[#8C8C8C]">
                  &ldquo;Tambah alur validasi &amp; revisi&rdquo; → Canvas ikut berubah.
                </p>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0E] p-3 font-mono text-[11px] leading-relaxed text-[#D4D4D8]">
                <div># PRD: Alur Checkout Aplikasi</div>
                <div className="text-[#8C8C8C]">## 3. Struktur Flow Kerja (Mermaid)</div>
                <div className="text-[#7DD3FC]">flowchart LR</div>
                <div className="text-[#93C5FD]">  ux_persona --&gt; flow_entry --&gt; flow_feat_1</div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#2F6BFF]/35 bg-[#2F6BFF]/15 px-3 py-2 text-xs font-semibold text-[#93C5FD]">
                <span>File prdin-alur-checkout.md siap unduh</span>
                <Download className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
