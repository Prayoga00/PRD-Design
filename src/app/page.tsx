'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Globe,
  Loader2,
  Mic,
  MicOff,
  PenTool,
  Plus,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { PRD_PURPOSE_MAP, PRD_PURPOSE_OPTIONS } from '@/lib/constants/prd-purposes';
import type { PrdPurpose } from '@/lib/types/prdin';
import { hydrateQuestionsClient } from '@/lib/ai/client-ai';
import {
  getAuthSnapshot,
  getServerAuthSnapshot,
  subscribeAuth,
} from '@/lib/storage/auth-store';
import {
  getServerStudioSnapshot,
  getStudioSnapshot,
  loadProjectFromHistory,
  startNewDiscoverySession,
  subscribeStudio,
  updateStudioStore,
} from '@/lib/storage/studio-store';
import { handleImeSafeEnterSubmit } from '@/lib/utils/keyboard';
import { StudioShell } from '@/components/layout/StudioShell';
import { GlassOrb } from '@/components/home/GlassOrb';
import { HeroVisual } from '@/components/home/HeroVisual';
import { StepByStepShowcase } from '@/components/home/StepByStepShowcase';

const PURPOSE_CARD_STYLES: Record<
  PrdPurpose,
  {
    Icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    subtitle: string;
  }
> = {
  'ui-ux-process': {
    Icon: PenTool,
    iconBg: 'bg-[#2F6BFF] text-white shadow-[0_6px_18px_-4px_rgba(47,107,255,0.65)]',
    subtitle: 'Mulai Riset & Flow UI/UX',
  },
  application: {
    Icon: Smartphone,
    iconBg: 'bg-[#5A4CF5] text-white shadow-[0_6px_18px_-4px_rgba(90,76,245,0.65)]',
    subtitle: 'Rancang Fitur Aplikasi',
  },
  website: {
    Icon: Globe,
    iconBg: 'bg-[#3F51F5] text-white shadow-[0_6px_18px_-4px_rgba(63,81,245,0.65)]',
    subtitle: 'Susun Struktur Website',
  },
};

const EXAMPLE_CONVERSATIONS: Array<{
  id: string;
  title: string;
  timeLabel: string;
  purpose: PrdPurpose;
  story: string;
}> = [
  {
    id: 'ex-1',
    title: 'Redesign alur checkout aplikasi belanja lokal agar langkah bayar lebih ringkas',
    timeLabel: 'Template · UI/UX',
    purpose: 'ui-ux-process',
    story:
      'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja lokal agar tingkat batal beli turun dan langkah bayar lebih ringkas.',
  },
  {
    id: 'ex-2',
    title: 'Aplikasi kasir & pencatatan stok harian kedai kopi UMKM',
    timeLabel: 'Template · Aplikasi',
    purpose: 'application',
    story:
      'Pemilik kedai kopi yang butuh aplikasi kasir dan pencatatan stok harian agar transaksi dan bahan baku otomatis sinkron.',
  },
  {
    id: 'ex-3',
    title: 'Website booking studio foto dengan cek tanggal kosong & pembayaran DP',
    timeLabel: 'Template · Website',
    purpose: 'website',
    story:
      'Fotografer wedding dan studio yang jadwalnya sering bentrok, butuh website booking agar klien bisa cek tanggal kosong dan bayar DP.',
  },
  {
    id: 'ex-4',
    title: 'Website portofolio desainer UI/UX & form brief proyek klien',
    timeLabel: 'Template · Website',
    purpose: 'website',
    story:
      'Desainer UI/UX freelance yang ingin website portofolio profesional agar calon klien mudah menilai studi kasus dan mengirim brief.',
  },
];

const HEADLINE_WORDS = ['APA', 'YANG', 'INGIN', 'KAMU', 'RANCANG?'];

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function HomePage() {
  const router = useRouter();
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
  const studio = useSyncExternalStore(
    subscribeStudio,
    getStudioSnapshot,
    getServerStudioSnapshot
  );

  const [homeTab, setHomeTab] = useState<'chat' | 'overview'>('chat');
  const [selectedPurpose, setSelectedPurpose] = useState<PrdPurpose>('website');
  const [thinkMode, setThinkMode] = useState<'normal' | 'deep-think'>('normal');
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [starterMenuOpen, setStarterMenuOpen] = useState(false);
  const [purposeMenuOpen, setPurposeMenuOpen] = useState(false);
  const [thinkMenuOpen, setThinkMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const railRef = useRef<HTMLElement | null>(null);
  const topBarRef = useRef<HTMLElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const greetingRef = useRef<HTMLParagraphElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const sublineRef = useRef<HTMLParagraphElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const hasPlayedEntranceRef = useRef(false);

  // Coordinated Web Animations API entrance timeline (disabled on prefers-reduced-motion)
  useEffect(() => {
    if (homeTab !== 'chat' || hasPlayedEntranceRef.current) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hasPlayedEntranceRef.current = true;
      return;
    }

    hasPlayedEntranceRef.current = true;
    const animations: Animation[] = [];
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const animateEl = (
      el: Element | null,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions
    ) => {
      if (!el || typeof el.animate !== 'function') return;
      animations.push(el.animate(keyframes, { fill: 'both', easing: ease, ...options }));
    };

    animateEl(
      railRef.current,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 380, delay: 20 }
    );

    animateEl(
      topBarRef.current,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 380, delay: 60 }
    );

    animateEl(
      orbRef.current,
      [
        {
          opacity: 0,
          transform: 'scale(0.92)',
          clipPath: 'circle(0% at 50% 50%)',
        },
        {
          opacity: 1,
          transform: 'scale(1)',
          clipPath: 'circle(75% at 50% 50%)',
        },
      ],
      { duration: 540, delay: 90 }
    );

    animateEl(
      greetingRef.current,
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 340, delay: 190 }
    );

    const words = headlineRef.current?.querySelectorAll('.iris-headline-word') ?? [];
    words.forEach((word, idx) => {
      animateEl(
        word,
        [
          { opacity: 0, transform: 'translateY(115%)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 420, delay: 240 + idx * 45 }
      );
    });

    animateEl(
      sublineRef.current,
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 360, delay: 390 }
    );

    animateEl(
      composerRef.current,
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 420, delay: 450 }
    );

    animateEl(
      cardsRef.current,
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 420, delay: 520 }
    );

    animateEl(
      historyRef.current,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 400, delay: 600 }
    );

    return () => {
      animations.forEach((anim) => anim.cancel());
    };
  }, [homeTab]);

  const greetingName = auth.user?.name ? auth.user.name.split(' ')[0] : 'Kreator';

  const recentFeed = useMemo(() => {
    type RecentFeedItem = {
      id: string;
      kind: 'saved' | 'example';
      title: string;
      timeLabel: string;
      purpose: PrdPurpose;
      hasWorkspace: boolean;
      story: string;
    };

    const saved: RecentFeedItem[] = studio.recentProjects.map((proj) => ({
      id: proj.id,
      kind: 'saved',
      title: proj.storyPreview || proj.title,
      timeLabel: new Date(proj.updatedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      purpose: proj.prdPurpose,
      hasWorkspace: Boolean(proj.workspace),
      story: proj.storyPreview,
    }));

    if (showAllHistory) {
      return saved.length > 0
        ? saved
        : EXAMPLE_CONVERSATIONS.map((ex): RecentFeedItem => ({
            ...ex,
            kind: 'example',
            hasWorkspace: false,
          }));
    }

    const combined: RecentFeedItem[] = [...saved];
    for (const ex of EXAMPLE_CONVERSATIONS) {
      if (combined.length >= 4) break;
      combined.push({
        ...ex,
        kind: 'example',
        hasWorkspace: false,
      });
    }
    return combined.slice(0, 4);
  }, [studio.recentProjects, showAllHistory]);

  const launchAskWithStory = async (storyText: string, purpose: PrdPurpose) => {
    const trimmed = storyText.trim();
    if (!trimmed || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const snapshot = startNewDiscoverySession(purpose);
      const userMsg = {
        id: `q1-u-${Date.now().toString(36)}`,
        role: 'user' as const,
        content: trimmed,
      };

      const withUser = updateStudioStore((prev) => ({
        ...prev,
        discovery: {
          ...prev.discovery,
          prdPurpose: purpose,
          q1Messages: [...prev.discovery.q1Messages, userMsg],
        },
      }));

      const storyForHydration =
        thinkMode === 'deep-think'
          ? `${trimmed} (Analisis mendalam: sertakan edge cases & detail UX)`
          : trimmed;

      const data = await hydrateQuestionsClient({
        prdPurpose: purpose,
        story: storyForHydration,
        chatHistory: withUser.discovery.q1Messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        previousQuestions: withUser.discovery.questions,
        aiSettings: snapshot.aiSettings,
      });

      updateStudioStore((prev) => ({
        ...prev,
        discovery: {
          ...prev.discovery,
          prdPurpose: purpose,
          q1Messages: [
            ...prev.discovery.q1Messages,
            {
              id: `q1-a-${Date.now().toString(36)}`,
              role: 'assistant',
              content: data.assistantReply,
            },
          ],
          q1Summary: data.q1Summary,
          questions: data.questions,
        },
      }));

      router.push(`/ask?purpose=${purpose}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal memulai Ask PRD.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVoice = () => {
    setVoiceNotice(null);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceNotice('Input suara belum didukung di browser ini. Ketik langsung cerita ide kamu.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'id-ID';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (transcript) {
          setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => {
        setIsListening(false);
        setVoiceNotice('Mikrofon tidak dapat diakses atau dibatalkan.');
      };
      rec.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = rec;
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Gagal mengaktifkan input suara.');
    }
  };

  const handlePurposeCardClick = (purpose: PrdPurpose) => {
    startNewDiscoverySession(purpose);
    router.push(`/ask?purpose=${purpose}`);
  };

  const activePurposeMeta = PRD_PURPOSE_MAP[selectedPurpose];

  return (
    <StudioShell
      breadcrumbs={['Home', 'PRDin Studio']}
      activeTab={homeTab}
      tabs={[
        { id: 'chat', label: 'Chat Mode' },
        { id: 'overview', label: 'Overview' },
      ]}
      onSelectTab={(tabId) => setHomeTab(tabId as 'chat' | 'overview')}
      railRef={railRef}
      topBarRef={topBarRef}
    >
      {homeTab === 'overview' ? (
        <main className="mx-auto w-full max-w-[1200px] space-y-8 px-4 pt-2 pb-12 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6BFF]/35 bg-[#2F6BFF]/15 px-3 py-1 text-xs font-medium text-[#93C5FD]">
                <Sparkles className="h-3.5 w-3.5" />
                PRDin Architecture Overview
              </span>
              <h1 className="text-2xl font-medium tracking-tight text-white sm:text-4xl">
                Dari 5 Pertanyaan Adaptif ke Workspace Visual &amp; Roadmap Siap Eksekusi.
              </h1>
              <p className="text-sm leading-relaxed text-[#8C8C8C]">
                Pilih tujuan PRD, jawab Q1 dengan bahasa sehari-hari, kunci tag Q2–Q5, lalu sunting Plan Text, Canvas React Flow, Kanban Roadmap, dan ekspor Markdown + Mermaid.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handlePurposeCardClick(selectedPurpose)}
                  className="iris-btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
                >
                  Mulai Ask PRD (5 Pertanyaan)
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/workspace')}
                  className="rounded-xl border border-white/[0.1] bg-[#161619] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E1E24]"
                >
                  Buka Workspace
                </button>
              </div>
            </div>

            <HeroVisual />
          </div>

          <StepByStepShowcase />
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-[min(100%,calc(708*var(--u)))] flex-1 flex-col items-center justify-center px-4 pt-2 pb-8 sm:px-0">
          {/* Living Glass Orb */}
          <div className="flex items-center justify-center">
            <GlassOrb orbRef={orbRef} />
          </div>

          {/* Greeting + Masked Headline + Subline */}
          <div className="mt-2 text-center">
            <p
              ref={greetingRef}
              style={{ fontSize: 'clamp(0.95rem, calc(17 * var(--u)), 1.25rem)' }}
              className="font-normal text-[#8C8C8C]"
            >
              Selamat Datang, {greetingName}
            </p>
            <h1
              ref={headlineRef}
              style={{ fontSize: 'clamp(1.45rem, calc(30 * var(--u)), 2.2rem)' }}
              className="mt-1 font-medium tracking-[-0.02em] text-white uppercase"
            >
              {HEADLINE_WORDS.map((word, idx) => (
                <span key={word} className="inline-block overflow-hidden align-bottom">
                  <span className="iris-headline-word inline-block">
                    {word}
                    {idx < HEADLINE_WORDS.length - 1 ? '\u00A0' : ''}
                  </span>
                </span>
              ))}
            </h1>
            <p
              ref={sublineRef}
              className="mt-1.5 text-xs leading-relaxed text-[#8C8C8C] sm:text-[13px]"
            >
              Ubah ide mentah jadi PRD terstruktur, alur kerja visual, dan panduan UI/UX dalam 5 pertanyaan.
            </p>
          </div>

          {/* Gradient-Bordered Composer (114u height, #151515, 14u radius) */}
          <div ref={composerRef} className="mt-5 w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void launchAskWithStory(draft, selectedPurpose);
              }}
              style={{ minHeight: 'max(108px, calc(114 * var(--u)))' }}
              className="iris-composer-shell relative flex flex-col justify-between rounded-[14px] px-4 py-3"
            >
              <label htmlFor="home-hero-composer" className="sr-only">
                Ceritakan ide produk atau desainmu untuk memulai Ask PRD
              </label>
              <textarea
                id="home-hero-composer"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) =>
                  handleImeSafeEnterSubmit(e, {
                    multiline: true,
                    onSubmit: () => {
                      void launchAskWithStory(draft, selectedPurpose);
                    },
                  })
                }
                placeholder="Ask Anything... Ceritakan 1 pengguna & tujuan produkmu"
                className="w-full resize-none bg-transparent text-sm text-white placeholder:text-[#6E6E6E] focus:outline-none"
              />

              {/* Bottom Chips Row */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex flex-wrap items-center gap-1.5">
                  {/* + Starter Stories Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setStarterMenuOpen((prev) => !prev);
                        setPurposeMenuOpen(false);
                        setThinkMenuOpen(false);
                      }}
                      aria-label="Pilih contoh cerita ide"
                      aria-expanded={starterMenuOpen}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-[#1D1D20] text-[#D4D4D8] transition-colors hover:border-white/20 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    {starterMenuOpen && (
                      <div className="iris-dropdown-menu absolute bottom-9 left-0 z-40 w-64 rounded-xl p-1.5">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E6E6E]">
                          Contoh Cerita ({activePurposeMeta.label})
                        </p>
                        {activePurposeMeta.starterStories.map((sample) => (
                          <button
                            key={sample.label}
                            type="button"
                            onClick={() => {
                              setDraft(sample.text);
                              setStarterMenuOpen(false);
                            }}
                            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-[#D4D4D8] hover:bg-white/[0.07] hover:text-white"
                          >
                            {sample.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Purpose Selector Chip (Normal -> Mode PRD) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setPurposeMenuOpen((prev) => !prev);
                        setStarterMenuOpen(false);
                        setThinkMenuOpen(false);
                      }}
                      aria-expanded={purposeMenuOpen}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1D1D20] px-2.5 text-[11px] font-medium text-[#D4D4D8] transition-colors hover:border-white/20 hover:text-white"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#2F6BFF]" />
                      <span>{activePurposeMeta.label}</span>
                      <ChevronDown className="h-3 w-3 text-[#6E6E6E]" />
                    </button>

                    {purposeMenuOpen && (
                      <div className="iris-dropdown-menu absolute bottom-9 left-0 z-40 w-52 rounded-xl p-1.5">
                        {PRD_PURPOSE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedPurpose(opt.id);
                              setPurposeMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs ${
                              selectedPurpose === opt.id
                                ? 'bg-[#2F6BFF]/20 text-white'
                                : 'text-[#8C8C8C] hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selectedPurpose === opt.id && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#2F6BFF]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deep Think / Reasoning Chip */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setThinkMenuOpen((prev) => !prev);
                        setStarterMenuOpen(false);
                        setPurposeMenuOpen(false);
                      }}
                      aria-expanded={thinkMenuOpen}
                      className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors ${
                        thinkMode === 'deep-think'
                          ? 'border-[#5A4CF5]/50 bg-[#5A4CF5]/20 text-[#DDD6FE]'
                          : 'border-white/[0.08] bg-[#1D1D20] text-[#D4D4D8] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <Sparkles className="h-3 w-3 text-[#5A4CF5]" />
                      <span>{thinkMode === 'deep-think' ? 'Deep Think' : 'Normal'}</span>
                      <ChevronDown className="h-3 w-3 text-[#6E6E6E]" />
                    </button>

                    {thinkMenuOpen && (
                      <div className="iris-dropdown-menu absolute bottom-9 left-0 z-40 w-48 rounded-xl p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setThinkMode('normal');
                            setThinkMenuOpen(false);
                          }}
                          className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${
                            thinkMode === 'normal'
                              ? 'bg-[#2F6BFF]/20 text-white'
                              : 'text-[#8C8C8C] hover:bg-white/[0.06]'
                          }`}
                        >
                          Normal · Cepat &amp; Ringkas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setThinkMode('deep-think');
                            setThinkMenuOpen(false);
                          }}
                          className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${
                            thinkMode === 'deep-think'
                              ? 'bg-[#5A4CF5]/25 text-white'
                              : 'text-[#8C8C8C] hover:bg-white/[0.06]'
                          }`}
                        >
                          Deep Think · Edge Case &amp; UX
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Voice + Gradient Send Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    aria-pressed={isListening}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors ${
                      isListening
                        ? 'border-[#2F6BFF] bg-[#2F6BFF]/25 text-white'
                        : 'border-white/[0.08] bg-[#1D1D20] text-[#8C8C8C] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="h-3 w-3 text-[#60A5FA]" />
                    ) : (
                      <Mic className="h-3 w-3" />
                    )}
                    <span>{isListening ? 'Mendengar...' : 'Voice'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!draft.trim() || isSubmitting}
                    aria-label="Kirim cerita ke Ask PRD"
                    className="iris-btn-gradient inline-flex h-7 w-7 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </form>

            {(submitError || voiceNotice) && (
              <p
                role="status"
                className="mt-2 rounded-lg border border-[#5A4CF5]/35 bg-[#5A4CF5]/15 px-3 py-1.5 text-xs text-[#C4B5FD]"
              >
                {submitError ?? voiceNotice}
              </p>
            )}
          </div>

          {/* Three Quick-Action Cards (Full-width rows on phone, 3 columns on sm+) */}
          <div
            ref={cardsRef}
            className="mt-3.5 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3"
          >
            {PRD_PURPOSE_OPTIONS.map((option) => {
              const meta = PURPOSE_CARD_STYLES[option.id];
              const Icon = meta.Icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePurposeCardClick(option.id)}
                  className="iris-surface-card group flex flex-col justify-between rounded-xl p-3.5 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-white">
                        {option.label}
                      </span>
                      <span className="block truncate text-[10px] text-[#6E6E6E]">
                        {option.shortDesc}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[11px] text-[#8C8C8C] group-hover:text-white">
                    <span>{meta.subtitle}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-[#2F6BFF]" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Recent Conversations Tree */}
          <section
            ref={historyRef}
            aria-labelledby="recent-conversations-heading"
            className="mt-5 w-full"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-white">
              <Clock className="h-3.5 w-3.5 text-[#8C8C8C]" />
              <h2 id="recent-conversations-heading">Recent Conversations</h2>
            </div>

            <div className={showAllHistory ? 'mt-2.5' : 'iris-history-fade mt-2.5'}>
              <ul className="relative ml-1.5 space-y-2 border-l border-white/[0.12] pl-4">
                {recentFeed.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute top-2.5 -left-4 h-px w-3 bg-white/[0.12]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (item.kind === 'saved') {
                          const loaded = loadProjectFromHistory(item.id);
                          router.push(loaded?.workspace ? '/workspace' : '/ask');
                        } else {
                          setDraft(item.story);
                          setSelectedPurpose(item.purpose);
                        }
                      }}
                      className="flex w-full flex-col gap-0.5 rounded-lg py-0.5 text-left transition-colors hover:text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="truncate text-xs text-[#8C8C8C] transition-colors hover:text-white">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#6E6E6E]">
                        {item.timeLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-2 pl-1">
              <button
                type="button"
                onClick={() => setShowAllHistory((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C8C8C] transition-colors hover:text-white"
              >
                <span>{showAllHistory ? 'Tutup Sebagian' : 'See More'}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </section>
        </main>
      )}
    </StudioShell>
  );
}
