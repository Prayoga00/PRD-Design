'use client';

import React, { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  AdaptiveQuestionId,
  AiSettings,
  PrdBusinessContext,
  PrdPurpose,
} from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import {
  createEmptyBusinessContext,
  createInitialDiscoveryState,
} from '@/lib/engine/smart-fallback';
import {
  generateWorkspaceClient,
  hydrateQuestionsClient,
} from '@/lib/ai/client-ai';
import {
  getServerStudioSnapshot,
  getStudioSnapshot,
  resetStudioStore,
  startNewDiscoverySession,
  subscribeStudio,
  updateStudioStore,
} from '@/lib/storage/studio-store';
import { DiscoveryWizard } from '@/components/discovery/DiscoveryWizard';
import { ApiSettingsModal } from '@/components/workspace/ApiSettingsModal';

function isValidPurpose(val: string | null): val is PrdPurpose {
  return val === 'ui-ux-process' || val === 'application' || val === 'website';
}

function AskPrdContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studio = useSyncExternalStore(
    subscribeStudio,
    getStudioSnapshot,
    getServerStudioSnapshot
  );

  const { discovery, aiSettings } = studio;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHydratingQ1, setIsHydratingQ1] = useState(false);
  const [q1Error, setQ1Error] = useState<string | null>(null);
  const [isGeneratingWorkspace, setIsGeneratingWorkspace] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Sync optional ?purpose=... query param cleanly, archiving prior session if purpose switched
  useEffect(() => {
    const queryPurpose = searchParams.get('purpose');
    if (!isValidPurpose(queryPurpose)) return;

    const current = getStudioSnapshot().discovery;
    if (current.prdPurpose !== queryPurpose) {
      if (current.q1Summary === null) {
        updateStudioStore((prev) => ({
          ...prev,
          discovery: createInitialDiscoveryState(queryPurpose),
        }));
      } else {
        startNewDiscoverySession(queryPurpose);
      }
    }
  }, [searchParams]);

  const hydrateWithPurposeAndStory = async (
    prdPurpose: PrdPurpose,
    story: string,
    chatHistory: { role: 'user' | 'assistant'; content: string }[],
    previousQuestions: typeof discovery.questions
  ) => {
    setIsHydratingQ1(true);
    try {
      const data = await hydrateQuestionsClient({
        prdPurpose,
        story,
        chatHistory,
        previousQuestions,
        aiSettings,
      });

      updateStudioStore((prev) => ({
        ...prev,
        discovery: {
          ...prev.discovery,
          prdPurpose,
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
    } catch (err) {
      setQ1Error(err instanceof Error ? err.message : 'Terjadi kendala memproses Q1.');
    } finally {
      setIsHydratingQ1(false);
    }
  };

  const handleChangePrdPurpose = async (nextPurpose: PrdPurpose) => {
    if (nextPurpose === discovery.prdPurpose || isHydratingQ1) return;
    setQ1Error(null);

    const lastUserStory = [...discovery.q1Messages]
      .reverse()
      .find((m) => m.role === 'user')?.content;

    if (!lastUserStory) {
      updateStudioStore((prev) => ({
        ...prev,
        discovery: createInitialDiscoveryState(nextPurpose),
      }));
      return;
    }

    const updated = updateStudioStore((prev) => ({
      ...prev,
      discovery: {
        ...prev.discovery,
        prdPurpose: nextPurpose,
      },
    }));

    await hydrateWithPurposeAndStory(
      nextPurpose,
      lastUserStory,
      updated.discovery.q1Messages.map((m) => ({ role: m.role, content: m.content })),
      updated.discovery.questions
    );
  };

  const handleSubmitQ1Story = async (story: string) => {
    setQ1Error(null);
    const activePurpose = discovery.prdPurpose ?? 'website';
    const userMsg = {
      id: `q1-u-${Date.now().toString(36)}`,
      role: 'user' as const,
      content: story,
    };

    const nextSnapshot = updateStudioStore((prev) => ({
      ...prev,
      discovery: {
        ...prev.discovery,
        prdPurpose: activePurpose,
        q1Messages: [...prev.discovery.q1Messages, userMsg],
      },
    }));

    await hydrateWithPurposeAndStory(
      activePurpose,
      story,
      nextSnapshot.discovery.q1Messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      nextSnapshot.discovery.questions
    );
  };

  const handleToggleTag = (questionId: AdaptiveQuestionId, tagId: string) => {
    updateStudioStore((prev) => {
      const q = prev.discovery.questions[questionId];
      const alreadySelected = q.selectedTagIds.includes(tagId);
      const isUnlimited =
        q.selectionMode === 'unlimited' || q.maxSelect === null || q.maxSelect === undefined;

      let nextSelected: string[];
      if (!isUnlimited && q.selectionMode === 'single') {
        nextSelected = alreadySelected ? [] : [tagId];
      } else if (alreadySelected) {
        nextSelected = q.selectedTagIds.filter((id) => id !== tagId);
      } else if (!isUnlimited && q.maxSelect !== null && q.selectedTagIds.length >= q.maxSelect) {
        nextSelected = q.selectedTagIds;
      } else {
        nextSelected = [...q.selectedTagIds, tagId];
      }

      return {
        ...prev,
        discovery: {
          ...prev.discovery,
          questions: {
            ...prev.discovery.questions,
            [questionId]: {
              ...q,
              selectedTagIds: nextSelected,
            },
          },
        },
      };
    });
  };

  const handleSelectAllTags = (questionId: AdaptiveQuestionId) => {
    updateStudioStore((prev) => {
      const q = prev.discovery.questions[questionId];
      return {
        ...prev,
        discovery: {
          ...prev.discovery,
          questions: {
            ...prev.discovery.questions,
            [questionId]: {
              ...q,
              selectedTagIds: q.tags.map((t) => t.id),
            },
          },
        },
      };
    });
  };

  const handleClearAllTags = (questionId: AdaptiveQuestionId) => {
    updateStudioStore((prev) => {
      const q = prev.discovery.questions[questionId];
      return {
        ...prev,
        discovery: {
          ...prev.discovery,
          questions: {
            ...prev.discovery.questions,
            [questionId]: {
              ...q,
              selectedTagIds: [],
            },
          },
        },
      };
    });
  };

  const handleAddCustomTag = (questionId: AdaptiveQuestionId, label: string): boolean => {
    const cleaned = label.trim();
    if (!cleaned) return false;

    const newId = `custom-${questionId}-${Date.now().toString(36)}`;
    const newTag = {
      id: newId,
      label: cleaned,
      description: 'Pilihan tambahan buatan sendiri.',
      source: 'user' as const,
    };

    updateStudioStore((prev) => {
      const q = prev.discovery.questions[questionId];
      const nextTags = [...q.tags, newTag];
      const nextSelected = [...q.selectedTagIds, newId];

      return {
        ...prev,
        discovery: {
          ...prev.discovery,
          questions: {
            ...prev.discovery.questions,
            [questionId]: {
              ...q,
              tags: nextTags,
              selectedTagIds: nextSelected,
            },
          },
        },
      };
    });

    return true;
  };

  const handleRemoveCustomTag = (questionId: AdaptiveQuestionId, tagId: string) => {
    updateStudioStore((prev) => {
      const q = prev.discovery.questions[questionId];
      return {
        ...prev,
        discovery: {
          ...prev.discovery,
          questions: {
            ...prev.discovery.questions,
            [questionId]: {
              ...q,
              tags: q.tags.filter((t) => t.id !== tagId),
              selectedTagIds: q.selectedTagIds.filter((id) => id !== tagId),
            },
          },
        },
      };
    });
  };

  const handleChangeBusinessContext = (next: PrdBusinessContext) => {
    updateStudioStore((prev) => ({
      ...prev,
      discovery: {
        ...prev.discovery,
        businessContext: next,
      },
    }));
  };

  const handleApplyBusinessPreset = () => {
    updateStudioStore((prev) => {
      const purpose = prev.discovery.prdPurpose ?? 'website';
      return {
        ...prev,
        discovery: {
          ...prev.discovery,
          businessContext: { ...PRD_PURPOSE_MAP[purpose].businessPresets.defaultPreset },
        },
      };
    });
  };

  const handleClearBusinessContext = () => {
    updateStudioStore((prev) => ({
      ...prev,
      discovery: {
        ...prev.discovery,
        businessContext: createEmptyBusinessContext(),
      },
    }));
  };

  const handleGenerateWorkspace = async () => {
    setGenerateError(null);
    setIsGeneratingWorkspace(true);

    try {
      const data = await generateWorkspaceClient({
        discovery,
        aiSettings,
      });

      updateStudioStore((prev) => ({
        ...prev,
        view: 'workspace',
        workspace: data.workspace,
      }));
      router.push('/workspace');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Gagal menyusun workspace.');
    } finally {
      setIsGeneratingWorkspace(false);
    }
  };

  const handleReset = () => {
    resetStudioStore();
    setQ1Error(null);
    setGenerateError(null);
  };

  const handleSaveApiSettings = (next: AiSettings) => {
    updateStudioStore((prev) => ({
      ...prev,
      aiSettings: next,
    }));
  };

  return (
    <>
      <DiscoveryWizard
        discovery={discovery}
        hasActiveWorkspace={Boolean(studio.workspace)}
        isHydratingQ1={isHydratingQ1}
        isGeneratingWorkspace={isGeneratingWorkspace}
        q1Error={q1Error}
        generateError={generateError}
        onChangePurpose={handleChangePrdPurpose}
        onSubmitQ1Story={handleSubmitQ1Story}
        onToggleTag={handleToggleTag}
        onSelectAllTags={handleSelectAllTags}
        onClearAllTags={handleClearAllTags}
        onAddCustomTag={handleAddCustomTag}
        onRemoveCustomTag={handleRemoveCustomTag}
        onChangeBusinessContext={handleChangeBusinessContext}
        onApplyBusinessPreset={handleApplyBusinessPreset}
        onClearBusinessContext={handleClearBusinessContext}
        onGenerateWorkspace={handleGenerateWorkspace}
        onOpenApiSettings={() => setIsSettingsOpen(true)}
        onResetDiscovery={handleReset}
      />

      <ApiSettingsModal
        open={isSettingsOpen}
        settings={aiSettings}
        onSave={handleSaveApiSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0E0E0E]" />}>
      <AskPrdContent />
    </Suspense>
  );
}
