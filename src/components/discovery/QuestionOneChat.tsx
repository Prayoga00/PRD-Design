'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Globe,
  Loader2,
  PenTool,
  Send,
  Smartphone,
  Sparkles,
  User,
} from 'lucide-react';
import type { PrdPurpose, Q1ExtractedSummary, Q1Message } from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP, PRD_PURPOSE_OPTIONS } from '@/lib/constants/prd-purposes';
import { handleImeSafeEnterSubmit } from '@/lib/utils/keyboard';
import { FormattedText } from '@/components/ui/FormattedText';

interface QuestionOneChatProps {
  prdPurpose: PrdPurpose;
  messages: Q1Message[];
  summary: Q1ExtractedSummary | null;
  isHydrating: boolean;
  errorMessage: string | null;
  onChangePurpose: (nextPurpose: PrdPurpose) => Promise<void>;
  onSubmitStory: (story: string) => Promise<void>;
}

const PURPOSE_ICONS: Record<PrdPurpose, React.ComponentType<{ className?: string }>> = {
  'ui-ux-process': PenTool,
  application: Smartphone,
  website: Globe,
};

export function QuestionOneChat({
  prdPurpose,
  messages,
  summary,
  isHydrating,
  errorMessage,
  onChangePurpose,
  onSubmitStory,
}: QuestionOneChatProps) {
  const [draft, setDraft] = useState('');
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isHydrating]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isHydrating) return;
    setDraft('');
    await onSubmitStory(trimmed);
  };

  return (
    <section
      aria-labelledby="q1-heading"
      className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#151518]"
    >
      {/* Purpose Switcher + Question Header */}
      <div className="border-b border-white/[0.08] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6BFF]/35 bg-[#2F6BFF]/15 px-2.5 py-1 text-xs font-semibold text-[#93C5FD]">
            <Sparkles className="h-3.5 w-3.5" />
            Pertanyaan 1 · Chat AI Penentu Tag
          </span>
          {summary && (
            <span className="rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/15 px-2.5 py-0.5 text-xs font-medium text-[#7DD3FC]">
              Q2–Q5 tersinkron
            </span>
          )}
        </div>

        {/* 3-Mode Tujuan Pembuatan PRD */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-[#D4D4D8]">
            Tujuan pembuatan PRD:
          </p>
          <div
            role="radiogroup"
            aria-label="Tujuan pembuatan PRD"
            className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.08] bg-[#101014] p-1"
          >
            {PRD_PURPOSE_OPTIONS.map((option) => {
              const Icon = PURPOSE_ICONS[option.id];
              const active = prdPurpose === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isHydrating}
                  onClick={() => void onChangePurpose(option.id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center transition-all disabled:opacity-60 ${
                    active
                      ? 'bg-[#1D243B] text-white ring-1 ring-[#2F6BFF]/60'
                      : 'text-[#8C8C8C] hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#60A5FA]' : ''}`} />
                  <span className="text-[11px] font-semibold leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-[#6E6E6E]">{purposeMeta.shortDesc}</p>
        </div>

        <h2 id="q1-heading" className="mt-3 text-base font-semibold leading-snug text-white">
          Ceritakan satu orang yang butuh desain/aplikasi/website ini. Sekarang tujuannya untuk apa?
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#8C8C8C]">
          Pertanyaan 2–5 dan isi workspace akan menyesuaikan mode <strong className="text-white">{purposeMeta.label}</strong> &amp; ceritamu.
        </p>
      </div>

      {/* Extracted context pill card */}
      {summary && (
        <div className="border-b border-white/[0.08] bg-[#121319] px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#7DD3FC]">
              Terdeteksi: {summary.productNameSuggestion}
            </span>
            <span className="rounded-md border border-white/[0.1] bg-[#1C1C22] px-2 py-0.5 text-[10px] font-semibold text-[#D4D4D8]">
              {purposeMeta.label}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-[#8C8C8C]">
            <span className="font-medium text-white">Persona:</span> {summary.persona}
          </p>
        </div>
      )}

      {/* Chat Thread */}
      <div className="prdin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3.5 max-h-[340px] lg:max-h-none">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  isUser
                    ? 'border-[#2F6BFF]/45 bg-[#2F6BFF]/20 text-[#93C5FD]'
                    : 'border-white/[0.1] bg-[#1C1C22] text-[#D4D4D8]'
                }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'iris-btn-gradient text-white'
                    : 'border border-white/[0.08] bg-[#1A1A1F] text-[#E4E4E7]'
                }`}
              >
                <FormattedText text={msg.content} />
              </div>
            </div>
          );
        })}

        {isHydrating && (
          <div className="flex items-center gap-2 text-xs text-[#8C8C8C]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2F6BFF]" />
            Menyesuaikan pertanyaan &amp; tag di Q2–Q5 untuk mode {purposeMeta.label}...
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Purpose-specific Starter Inspirations */}
      <div className="border-t border-white/[0.08] bg-[#121216] px-5 pt-3 pb-2">
        <p className="mb-1.5 text-[11px] font-medium text-[#6E6E6E]">
          Contoh cerita cepat ({purposeMeta.label}):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {purposeMeta.starterStories.map((sample) => (
            <button
              key={sample.label}
              type="button"
              disabled={isHydrating}
              onClick={() => onSubmitStory(sample.text)}
              className="rounded-lg border border-white/[0.08] bg-[#1B1B20] px-2.5 py-1 text-xs font-medium text-[#D4D4D8] transition-colors hover:border-[#2F6BFF]/50 hover:bg-[#2F6BFF]/15 hover:text-white disabled:opacity-50"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="border-t border-white/[0.08] p-4"
      >
        {errorMessage && (
          <p className="mb-2 rounded-lg border border-[#5A4CF5]/40 bg-[#5A4CF5]/15 px-3 py-1.5 text-xs text-[#C4B5FD]">
            {errorMessage}
          </p>
        )}
        <label htmlFor="q1-story-input" className="sr-only">
          Cerita pengguna dan tujuan pembuatan PRD
        </label>
        <div className="iris-composer-shell flex items-end gap-2 rounded-xl px-3 py-2">
          <textarea
            id="q1-story-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) =>
              handleImeSafeEnterSubmit(e, {
                multiline: true,
                onSubmit: () => {
                  void handleSend();
                },
              })
            }
            placeholder={purposeMeta.q1Placeholder}
            className="w-full resize-none bg-transparent text-sm text-white placeholder:text-[#6E6E6E] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isHydrating}
            aria-label="Kirim cerita Pertanyaan 1"
            className="iris-btn-gradient inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isHydrating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Kirim
          </button>
        </div>
      </form>
    </section>
  );
}
