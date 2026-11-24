'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2, RotateCcw, Settings2 } from 'lucide-react';
import type {
  AdaptiveQuestionConfig,
  AdaptiveQuestionId,
  DiscoveryState,
  PrdPurpose,
} from '@/lib/types/prdin';
import { QuestionOneChat } from './QuestionOneChat';
import { AdaptiveTagStep } from './AdaptiveTagStep';
import { StudioShell } from '@/components/layout/StudioShell';

interface DiscoveryWizardProps {
  discovery: DiscoveryState;
  hasActiveWorkspace: boolean;
  isHydratingQ1: boolean;
  isGeneratingWorkspace: boolean;
  q1Error: string | null;
  generateError: string | null;
  onChangePurpose: (nextPurpose: PrdPurpose) => Promise<void>;
  onSubmitQ1Story: (story: string) => Promise<void>;
  onToggleTag: (questionId: AdaptiveQuestionId, tagId: string) => void;
  onAddCustomTag: (questionId: AdaptiveQuestionId, label: string) => boolean;
  onRemoveCustomTag: (questionId: AdaptiveQuestionId, tagId: string) => void;
  onGenerateWorkspace: () => Promise<void>;
  onOpenApiSettings: () => void;
  onResetDiscovery: () => void;
}

export function DiscoveryWizard({
  discovery,
  hasActiveWorkspace,
  isHydratingQ1,
  isGeneratingWorkspace,
  q1Error,
  generateError,
  onChangePurpose,
  onSubmitQ1Story,
  onToggleTag,
  onAddCustomTag,
  onRemoveCustomTag,
  onGenerateWorkspace,
  onOpenApiSettings,
  onResetDiscovery,
}: DiscoveryWizardProps) {
  const router = useRouter();
  const qIds: AdaptiveQuestionId[] = ['q2', 'q3', 'q4', 'q5'];
  const q1Done = discovery.q1Summary !== null;

  const qCompletion = qIds.map((id) => {
    const q: AdaptiveQuestionConfig = discovery.questions[id];
    return q.selectedTagIds.length >= q.minSelect;
  });

  const allCompleted = q1Done && qCompletion.every(Boolean);
  const completedCount = (q1Done ? 1 : 0) + qCompletion.filter(Boolean).length;

  return (
    <StudioShell
      breadcrumbs={['Home', 'Ask PRD (5 Pertanyaan)']}
      activeTab="ask"
      tabs={[
        { id: 'ask', label: 'Chat Mode' },
        { id: 'workspace', label: 'Workspace' },
      ]}
      onSelectTab={(tabId) => {
        if (tabId === 'workspace') {
          router.push('/workspace');
        }
      }}
      statusLabel="Progres Discovery"
      statusCount={`${completedCount}/5`}
      onStatusClick={onOpenApiSettings}
      subBarRightExtra={
        <div className="flex items-center gap-2">
          {hasActiveWorkspace && (
            <button
              type="button"
              onClick={() => router.push('/workspace')}
              className="hidden rounded-lg border border-white/[0.1] bg-[#16161A] px-2.5 py-1.5 text-xs font-medium text-[#D4D4D8] hover:bg-white/[0.08] sm:inline-flex"
            >
              Lihat Workspace Aktif
            </button>
          )}
          <button
            type="button"
            onClick={onOpenApiSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#16161A] px-3 py-1.5 text-xs font-medium text-[#D4D4D8] hover:bg-white/[0.08]"
          >
            <Settings2 className="h-3.5 w-3.5 text-[#2F6BFF]" />
            AI Engine
          </button>
          <button
            type="button"
            onClick={onResetDiscovery}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#16161A] px-3 py-1.5 text-xs font-medium text-[#D4D4D8] hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      }
    >
      {/* Main 5-Question Studio */}
      <main className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-4 pt-2 pb-10 sm:px-6 lg:grid-cols-[440px_1fr] lg:items-start">
        {/* Left Sticky Column: Question 1 AI Chat */}
        <div className="lg:sticky lg:top-4 lg:h-[calc(100dvh-132px)]">
          <QuestionOneChat
            prdPurpose={discovery.prdPurpose ?? 'website'}
            messages={discovery.q1Messages}
            summary={discovery.q1Summary}
            isHydrating={isHydratingQ1}
            errorMessage={q1Error}
            onChangePurpose={onChangePurpose}
            onSubmitStory={onSubmitQ1Story}
          />
        </div>

        {/* Right Column: Live Adaptive Tag Steps (Q2 - Q5) */}
        <div className="space-y-4 pb-20">
          {!q1Done && (
            <div className="rounded-xl border border-[#2F6BFF]/35 bg-[#2F6BFF]/10 px-4 py-3 text-xs leading-relaxed text-[#BFDBFE]">
              <strong className="text-white">Mulai dari Pertanyaan 1 di sebelah kiri:</strong> begitu kamu kirim cerita singkat tentang pengguna dan tujuan produkmu, pilihan tag di Pertanyaan 2–5 di bawah ini akan otomatis berubah menyesuaikan konteks ceritamu.
            </div>
          )}

          {qIds.map((id) => (
            <AdaptiveTagStep
              key={id}
              question={discovery.questions[id]}
              isHydratedFromQ1={q1Done}
              onToggleTag={onToggleTag}
              onAddCustomTag={onAddCustomTag}
              onRemoveCustomTag={onRemoveCustomTag}
            />
          ))}

          {/* Action Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#151518] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  {[
                    { label: 'Q1 Cerita', done: q1Done },
                    { label: 'Q2 Awal', done: qCompletion[0] },
                    { label: 'Q3 3 Fitur', done: qCompletion[1] },
                    { label: 'Q4 Value', done: qCompletion[2] },
                    { label: 'Q5 Retensi', done: qCompletion[3] },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
                        item.done
                          ? 'border border-[#2F6BFF]/40 bg-[#2F6BFF]/20 text-[#93C5FD]'
                          : 'border border-white/[0.06] bg-[#1D1D22] text-[#6E6E6E]'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {item.label}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#8C8C8C]">
                  {allCompleted
                    ? 'Semua 5 pertanyaan siap! Masuk ke workspace untuk melihat Plan Text, Canvas Zoomable, dan Chat AI.'
                    : 'Lengkapi Q1 dan pilih tag di Q2–Q5 untuk mengaktifkan workspace PRDin.'}
                </p>
              </div>

              <button
                type="button"
                disabled={!allCompleted || isGeneratingWorkspace}
                onClick={() => void onGenerateWorkspace()}
                className="iris-btn-gradient inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isGeneratingWorkspace ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyusun Workspace...
                  </>
                ) : (
                  <>
                    Masuk ke Workspace PRDin
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {generateError && (
              <p className="mt-3 rounded-lg border border-[#5A4CF5]/40 bg-[#5A4CF5]/15 px-3 py-2 text-xs text-[#C4B5FD]">
                {generateError}
              </p>
            )}
          </div>
        </div>
      </main>
    </StudioShell>
  );
}
