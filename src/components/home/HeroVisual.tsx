'use client';

import React, { useState, useSyncExternalStore } from 'react';
import {
  Check,
  FileCode2,
  GitBranch,
  MessageSquareText,
  Pause,
  Play,
  Sparkles,
  UserCheck,
} from 'lucide-react';

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => { };
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroVisual() {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const [paused, setPaused] = useState(false);
  const [hoveredLayer, setHoveredLayer] = useState<'ask' | 'canvas' | 'export' | null>(null);

  const isPaused = prefersReducedMotion || paused;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151518] p-5 shadow-2xl">
      {/* Subtle dark dot-grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Top mini studio bar + pause control */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full bg-[#2F6BFF] ${isPaused ? '' : 'iris-beacon'
              }`}
          />
          <span className="text-xs font-semibold text-white">PRDin Live Architecture</span>
        </div>

        <button
          type="button"
          onClick={() => setPaused((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#1C1C22] px-2.5 py-1 text-[11px] font-semibold text-[#D4D4D8] transition-colors hover:bg-white/[0.08]"
        >
          {isPaused ? (
            <>
              <Play className="h-3 w-3" />
              Putar
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" />
              Jeda
            </>
          )}
        </button>
      </div>

      {/* Layered visual composition */}
      <div className="relative z-10 mt-4 space-y-3">
        {/* Layer 1: Q1 Story & Adaptive Tags */}
        <div
          onMouseEnter={() => setHoveredLayer('ask')}
          onMouseLeave={() => setHoveredLayer(null)}
          className={`rounded-xl border bg-[#1A1A20]/95 p-3.5 transition-colors ${hoveredLayer === 'ask'
            ? 'border-[#2F6BFF] ring-2 ring-[#2F6BFF]/25'
            : 'border-white/[0.08]'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2F6BFF]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#93C5FD]">
              <MessageSquareText className="h-3 w-3" />
              1. Ask PRD (Q1–Q5)
            </span>
            <span className="text-[10px] font-medium text-[#7DD3FC]">Tag tersinkron</span>
          </div>
          <p className="mt-2 text-xs text-[#D4D4D8]">
            &ldquo;Bikin alur checkout aplikasi UMKM agar pembeli cepat bayar tanpa bingung.&rdquo;
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['UI / UX Proses', 'Wireframe 4 State', 'QRIS Instan'].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-lg border border-[#2F6BFF]/35 bg-[#2F6BFF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#BFDBFE]"
              >
                <Check className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Layer 2: Center Canvas Node Graph Preview */}
        <div
          onMouseEnter={() => setHoveredLayer('canvas')}
          onMouseLeave={() => setHoveredLayer(null)}
          className={`rounded-xl border bg-[#1A1A20]/95 p-3.5 transition-colors ${hoveredLayer === 'canvas'
            ? 'border-[#5A4CF5] ring-2 ring-[#5A4CF5]/25'
            : 'border-white/[0.08]'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5A4CF5]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#C4B5FD]">
              <GitBranch className="h-3 w-3" />
              2. Canvas UX Research &amp; Flow Bisnis
            </span>
            <span className="font-mono text-[10px] text-[#8C8C8C]">Zoom 100%</span>
          </div>

          <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="rounded-lg border border-[#38BDF8]/30 bg-[#12161E] p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#7DD3FC]">
                <UserCheck className="h-3 w-3" />
                UX Research
              </div>
              <p className="mt-1 text-[11px] font-semibold text-white">
                Persona &amp; Pain Point
              </p>
            </div>

            <span className="text-xs text-[#2F6BFF]" aria-hidden="true">
              →
            </span>

            <div className="rounded-lg border border-[#2F6BFF]/35 border-l-4 border-l-[#2F6BFF] bg-[#121622] p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#93C5FD]">
                <Sparkles className="h-3 w-3" />
                Flow Kerja
              </div>
              <p className="mt-1 text-[11px] font-semibold text-white">
                Entry → Validasi → Hasil
              </p>
            </div>
          </div>
        </div>

        {/* Layer 3: Final PRD Export Output */}
        <div
          onMouseEnter={() => setHoveredLayer('export')}
          onMouseLeave={() => setHoveredLayer(null)}
          className={`flex items-center justify-between gap-3 rounded-xl border bg-[#0E0E12] px-4 py-3 text-white transition-colors ${hoveredLayer === 'export'
            ? 'border-[#2F6BFF] ring-2 ring-[#2F6BFF]/25'
            : 'border-white/[0.08]'
            }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#93C5FD]">
              <FileCode2 className="h-3.5 w-3.5" />
              3. PRD + Mermaid Siap Unduh
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-[#8C8C8C]">
              prdin-alur-checkout.md · flowchart LR
            </p>
          </div>
          <span className="iris-btn-gradient shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold">
            .md Ready
          </span>
        </div>
      </div>
    </div>
  );
}
