'use client';

import React, { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Edit3,
  FileText,
  MessageSquare,
  Network,
  RotateCcw,
} from 'lucide-react';
import type {
  AiSettings,
  PrdinEdge,
  PrdinNode,
  RoadmapStatus,
  RoadmapTask,
  TaskPriority,
  WorkspacePatch,
  WorkspaceState,
} from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import { sendWorkspaceChatClient } from '@/lib/ai/client-ai';
import { applyWorkspacePatch } from '@/lib/engine/layout-graph';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';
import { createRoadmapTask } from '@/lib/engine/roadmap-defaults';
import {
  getServerStudioSnapshot,
  getStudioSnapshot,
  resetStudioStore,
  subscribeStudio,
  updateStudioStore,
} from '@/lib/storage/studio-store';
import { StudioShell } from '@/components/layout/StudioShell';
import { GlassOrb } from '@/components/home/GlassOrb';
import { PlanTextPanel } from '@/components/workspace/PlanTextPanel';
import { InteractiveCanvas } from '@/components/workspace/InteractiveCanvas';
import { WorkspaceAiChat } from '@/components/workspace/WorkspaceAiChat';
import { RoadmapBoardView } from '@/components/workspace/RoadmapBoardView';
import { PrdDownloadModal } from '@/components/workspace/PrdDownloadModal';
import { ApiSettingsModal } from '@/components/workspace/ApiSettingsModal';

type MobileTab = 'plan' | 'canvas' | 'chat';

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studio = useSyncExternalStore(
    subscribeStudio,
    getStudioSnapshot,
    getServerStudioSnapshot
  );

  const { workspace, aiSettings } = studio;
  const [undoStack, setUndoStack] = useState<WorkspaceState[]>([]);
  const workspaceMode: 'studio' | 'roadmap' =
    searchParams.get('tab') === 'roadmap' ? 'roadmap' : 'studio';
  const setWorkspaceMode = useCallback(
    (mode: 'studio' | 'roadmap') => {
      router.replace(mode === 'roadmap' ? '/workspace?tab=roadmap' : '/workspace', {
        scroll: false,
      });
    },
    [router]
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [focusRequestToken, setFocusRequestToken] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleLoadSampleWorkspace = () => {
    const discovery = createInitialDiscoveryState('ui-ux-process');
    const story =
      'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja lokal agar langkah bayar lebih ringkas.';
    const hydrated = hydrateQuestionsFromStoryFallback(story, discovery.questions, 'ui-ux-process');
    discovery.q1Messages.push(
      { id: 'sample-u', role: 'user', content: story },
      { id: 'sample-a', role: 'assistant', content: hydrated.assistantReply }
    );
    discovery.q1Summary = hydrated.q1Summary;
    discovery.questions = hydrated.questions;
    discovery.questions.q2.selectedTagIds = [discovery.questions.q2.tags[0].id];
    discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
    discovery.questions.q4.selectedTagIds = [discovery.questions.q4.tags[0].id];
    discovery.questions.q5.selectedTagIds = [discovery.questions.q5.tags[0].id];

    const sampleWorkspace = buildWorkspaceStateFromOutput(
      discovery,
      buildWorkspaceFallback(discovery),
      'smart-fallback'
    );

    updateStudioStore((prev) => ({
      ...prev,
      view: 'workspace',
      discovery,
      workspace: sampleWorkspace,
    }));
  };

  const handleSendWorkspaceChat = async (message: string) => {
    if (!workspace || isChatSending) return;
    setChatError(null);

    const userMsg = {
      id: `w-u-${Date.now().toString(36)}`,
      role: 'user' as const,
      content: message,
    };

    const snapshotBefore = workspace;
    const withUserSnapshot = updateStudioStore((prev) => {
      if (!prev.workspace) return prev;
      return {
        ...prev,
        workspace: {
          ...prev.workspace,
          chatMessages: [...prev.workspace.chatMessages, userMsg],
        },
      };
    });

    setIsChatSending(true);

    try {
      const data = await sendWorkspaceChatClient({
        message,
        workspace: withUserSnapshot.workspace!,
        aiSettings,
      });

      const patch = (data.patch ?? {}) as WorkspacePatch;
      updateStudioStore((prev) => {
        if (!prev.workspace) return prev;
        const { nextState, summary } = applyWorkspacePatch(prev.workspace, patch);
        if (summary.length > 0) {
          setUndoStack((stack) => [...stack.slice(-9), snapshotBefore]);
        }
        return {
          ...prev,
          workspace: {
            ...nextState,
            aiMode: data.aiMode ?? nextState.aiMode,
            chatMessages: [
              ...nextState.chatMessages,
              {
                id: `w-a-${Date.now().toString(36)}`,
                role: 'assistant',
                content: data.assistantMessage,
                mutationSummary: summary,
              },
            ],
          },
        };
      });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Gagal menghubungi Chat AI.');
    } finally {
      setIsChatSending(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    updateStudioStore((prev) => ({
      ...prev,
      workspace: previous,
    }));
  };

  const handleQuickAddNode = (zone: 'business-flow' | 'ux-research') => {
    if (!workspace) return;
    setUndoStack((prev) => [...prev.slice(-9), workspace]);

    const id = `${zone === 'ux-research' ? 'ux' : 'flow'}-manual-${Date.now().toString(36)}`;
    const secId = `sec-${id}`;
    const anchor =
      workspace.nodes.find((n) => n.id === workspace.selectedNodeId) ??
      workspace.nodes.filter((n) => n.data.zone === 'business-flow').slice(-1)[0];

    const title =
      zone === 'ux-research' ? 'Catatan Riset UX Baru' : 'Langkah Flow Bisnis Baru';

    const patch: WorkspacePatch = {
      upsertNodes: [
        {
          id,
          title,
          subtitle:
            zone === 'ux-research'
              ? 'Insight tambahan mengenai perilaku atau kendala pengguna.'
              : 'Tahap baru pada struktur alur kerja bisnis.',
          kind: zone === 'ux-research' ? 'ux-pain' : 'flow-feature',
          zone,
          linkedSectionId: secId,
          connectFromNodeId: zone === 'business-flow' ? anchor?.id : undefined,
          edgeLabel: zone === 'business-flow' ? 'Lanjut' : undefined,
          details: {
            purpose: 'Menjelaskan peran blok baru ini dalam keseluruhan pengalaman produk.',
            actor: 'Pengguna Utama',
            uiComponents: ['Panel Informasi', 'Tombol Aksi Utama'],
            userStory: `Sebagai pengguna, saya ingin melalui "${title}" dengan alur yang jelas.`,
            acceptanceCriteria: ['Tersedia status konfirmasi dan navigasi lanjutan yang jelas.'],
            edgeCases: ['Input kosong atau pengguna membatalkan di tengah proses.'],
          },
        },
      ],
      upsertPlanSections: [
        {
          id: secId,
          category: zone === 'ux-research' ? 'ux-research' : 'business-flow',
          title,
          linkedNodeId: id,
          content:
            zone === 'ux-research'
              ? 'Catatan UX Research tambahan. Klik tombol Edit untuk menuliskan temuan atau hipotesis desainmu.'
              : 'Tahap baru pada alur kerja bisnis. Klik tombol Edit untuk memperinci tujuan, UI, dan acceptance criteria-nya.',
        },
      ],
    };

    updateStudioStore((prev) => {
      if (!prev.workspace) return prev;
      const { nextState } = applyWorkspacePatch(prev.workspace, patch);
      return {
        ...prev,
        workspace: { ...nextState, selectedNodeId: id },
      };
    });
  };

  const handleDeleteSelectedNode = () => {
    if (!workspace || !workspace.selectedNodeId || workspace.nodes.length <= 1) return;
    const targetId = workspace.selectedNodeId;
    setUndoStack((prev) => [...prev.slice(-9), workspace]);

    updateStudioStore((prev) => {
      if (!prev.workspace) return prev;
      const { nextState } = applyWorkspacePatch(prev.workspace, {
        removeNodeIds: [targetId],
      });
      return {
        ...prev,
        workspace: {
          ...nextState,
          planSections: nextState.planSections.filter((s) => s.linkedNodeId !== targetId),
        },
      };
    });
  };

  const handleAddTask = useCallback(
    (input: {
      title: string;
      description?: string;
      status: RoadmapStatus;
      priority: TaskPriority;
      linkedNodeId?: string;
    }) => {
      const newTask = createRoadmapTask(input);
      updateStudioStore((prev) => {
        if (!prev.workspace) return prev;
        return {
          ...prev,
          workspace: {
            ...prev.workspace,
            roadmapTasks: [...(prev.workspace.roadmapTasks ?? []), newTask],
          },
        };
      });
    },
    []
  );

  const handleMoveTask = useCallback((taskId: string, nextStatus: RoadmapStatus) => {
    const now = Date.now();
    updateStudioStore((prev) => {
      if (!prev.workspace) return prev;
      return {
        ...prev,
        workspace: {
          ...prev.workspace,
          roadmapTasks: (prev.workspace.roadmapTasks ?? []).map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: nextStatus,
                  failureReason: nextStatus === 'failed' ? task.failureReason : undefined,
                  updatedAt: now,
                }
              : task
          ),
        },
      };
    });
  }, []);

  const handleUpdateTask = useCallback(
    (
      taskId: string,
      updates: Partial<Pick<RoadmapTask, 'title' | 'description' | 'priority' | 'failureReason'>>
    ) => {
      const now = Date.now();
      updateStudioStore((prev) => {
        if (!prev.workspace) return prev;
        return {
          ...prev,
          workspace: {
            ...prev.workspace,
            roadmapTasks: (prev.workspace.roadmapTasks ?? []).map((task) =>
              task.id === taskId ? { ...task, ...updates, updatedAt: now } : task
            ),
          },
        };
      });
    },
    []
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    updateStudioStore((prev) => {
      if (!prev.workspace) return prev;
      return {
        ...prev,
        workspace: {
          ...prev.workspace,
          roadmapTasks: (prev.workspace.roadmapTasks ?? []).filter((t) => t.id !== taskId),
        },
      };
    });
  }, []);

  const handleResetAll = () => {
    resetStudioStore();
    setUndoStack([]);
    setChatError(null);
    router.push('/ask');
  };

  const handleSaveApiSettings = (next: AiSettings) => {
    updateStudioStore((prev) => ({
      ...prev,
      aiSettings: next,
    }));
  };

  if (!workspace) {
    return (
      <StudioShell
        breadcrumbs={['Home', 'Workspace']}
        activeTab="workspace"
        tabs={[
          { id: 'ask', label: 'Ask PRD' },
          { id: 'workspace', label: 'Workspace' },
        ]}
        onSelectTab={(tabId) => {
          if (tabId === 'ask') router.push('/ask');
        }}
      >
        <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-5 py-12 text-center">
          <div className="mb-2">
            <GlassOrb sizeClassName="h-32 w-32" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">
            Workspace PRDin belum terisi
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#8C8C8C]">
            Mulai dari Ask PRD (5 pertanyaan adaptif) agar Plan Text, Canvas UX Research &amp; Flow Kerja Bisnis, Task Roadmap, serta Chat AI otomatis tersusun untuk proyekmu.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/ask"
              className="iris-btn-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
            >
              Mulai Ask PRD
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={handleLoadSampleWorkspace}
              className="rounded-xl border border-white/[0.1] bg-[#16161A] px-5 py-2.5 text-xs font-semibold text-[#D4D4D8] hover:bg-white/[0.08]"
            >
              Muat Contoh Workspace Jadi
            </button>
          </div>
        </main>
      </StudioShell>
    );
  }

  const roadmapTasks = workspace.roadmapTasks ?? [];
  const roadmapDoneCount = roadmapTasks.filter((t) => t.status === 'done').length;
  const prdPurpose = workspace.discovery.prdPurpose ?? 'website';

  const commitTitle = () => {
    const cleaned = draftTitle.trim();
    if (cleaned) {
      updateStudioStore((prev) =>
        prev.workspace
          ? { ...prev, workspace: { ...prev.workspace, projectTitle: cleaned } }
          : prev
      );
    }
    setEditingTitle(false);
  };

  return (
    <>
      <StudioShell
        breadcrumbs={['Home', 'Workspace', workspace.projectTitle]}
        activeTab={workspaceMode}
        tabs={[
          { id: 'studio', label: 'Workspace 3-Kolom' },
          { id: 'roadmap', label: `Roadmap (${roadmapDoneCount}/${roadmapTasks.length})` },
        ]}
        onSelectTab={(id) => setWorkspaceMode(id as 'studio' | 'roadmap')}
        showTopGlow={false}
        lockViewport={true}
        statusLabel={
          workspace.aiMode === 'live-llm' || Boolean(aiSettings.apiKey.trim())
            ? 'Live LLM'
            : 'Smart Engine'
        }
        statusCount={workspace.nodes.length}
        onStatusClick={() => setIsSettingsOpen(true)}
        subBarLeftExtra={
          editingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitTitle();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                className="rounded-lg border border-[#2F6BFF] bg-[#151518] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Simpan nama proyek"
                className="iris-btn-gradient rounded-md p-1"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="rounded-full border border-[#2F6BFF]/35 bg-[#2F6BFF]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#93C5FD]">
                {PRD_PURPOSE_MAP[prdPurpose].label}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(workspace.projectTitle);
                  setEditingTitle(true);
                }}
                aria-label="Ubah nama proyek"
                title="Ubah nama proyek"
                className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        }
        subBarRightExtra={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push('/ask')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#16161A] px-2.5 py-1.5 text-xs font-medium text-[#D4D4D8] hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit 5 Pertanyaan</span>
              <span className="sm:hidden">Q1–Q5</span>
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              title="Mulai proyek baru dari awal"
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#16161A] px-2.5 py-1.5 text-xs font-medium text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Baru
            </button>

            <button
              type="button"
              onClick={() => setIsDownloadOpen(true)}
              className="iris-btn-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PRD (.md)</span>
            </button>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.08] lg:overflow-hidden">
          {workspaceMode === 'roadmap' ? (
            <RoadmapBoardView
              tasks={roadmapTasks}
              nodes={workspace.nodes}
              onBackToCanvas={() => setWorkspaceMode('studio')}
              onFocusNodeInCanvas={(nodeId) => {
                updateStudioStore((prev) =>
                  prev.workspace
                    ? { ...prev, workspace: { ...prev.workspace, selectedNodeId: nodeId } }
                    : prev
                );
                setWorkspaceMode('studio');
                setFocusRequestToken((n) => n + 1);
                setMobileTab('canvas');
              }}
              onAddTask={handleAddTask}
              onMoveTask={handleMoveTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          ) : (
            <>
              {/* Mobile / Tablet Pane Switcher */}
              <div className="flex border-b border-white/[0.08] bg-[#121215] px-3 py-1.5 lg:hidden">
                {[
                  { id: 'plan' as const, label: 'Plan Text', Icon: FileText },
                  { id: 'canvas' as const, label: 'Canvas', Icon: Network },
                  { id: 'chat' as const, label: 'Chat AI', Icon: MessageSquare },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobileTab(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold ${
                      mobileTab === id
                        ? 'bg-[#2F6BFF]/20 text-white ring-1 ring-[#2F6BFF]/50'
                        : 'text-[#8C8C8C] hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* 3-Column Studio Grid */}
              <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(300px,30%)_1fr_minmax(290px,27%)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
                <div className={`min-h-0 lg:h-full lg:overflow-hidden ${mobileTab === 'plan' ? 'block' : 'hidden'} lg:block`}>
                  <PlanTextPanel
                    planSections={workspace.planSections}
                    nodes={workspace.nodes}
                    roadmapTasks={roadmapTasks}
                    selectedNodeId={workspace.selectedNodeId}
                    onSelectNodeFromPlan={(nodeId) => {
                      updateStudioStore((prev) =>
                        prev.workspace
                          ? { ...prev, workspace: { ...prev.workspace, selectedNodeId: nodeId } }
                          : prev
                      );
                      setFocusRequestToken((n) => n + 1);
                      setMobileTab('canvas');
                    }}
                    onUpdateSectionContent={(sectionId, nextContent) =>
                      updateStudioStore((prev) =>
                        prev.workspace
                          ? {
                              ...prev,
                              workspace: {
                                ...prev.workspace,
                                planSections: prev.workspace.planSections.map((s) =>
                                  s.id === sectionId ? { ...s, content: nextContent } : s
                                ),
                              },
                            }
                          : prev
                      )
                    }
                    onAddTask={handleAddTask}
                    onMoveTask={handleMoveTask}
                    onDeleteTask={handleDeleteTask}
                    onOpenRoadmapDetail={() => setWorkspaceMode('roadmap')}
                  />
                </div>

                <div className={`min-h-[420px] lg:h-full lg:min-h-0 lg:overflow-hidden ${mobileTab === 'canvas' ? 'block' : 'hidden'} lg:block`}>
                  <InteractiveCanvas
                    nodes={workspace.nodes}
                    edges={workspace.edges}
                    selectedNodeId={workspace.selectedNodeId}
                    focusRequestToken={focusRequestToken}
                    onSelectNode={(nodeId) =>
                      updateStudioStore((prev) =>
                        prev.workspace
                          ? { ...prev, workspace: { ...prev.workspace, selectedNodeId: nodeId } }
                          : prev
                      )
                    }
                    onNodesChangePersist={(nextNodes: PrdinNode[]) =>
                      updateStudioStore((prev) =>
                        prev.workspace
                          ? { ...prev, workspace: { ...prev.workspace, nodes: nextNodes } }
                          : prev
                      )
                    }
                    onEdgesChangePersist={(nextEdges: PrdinEdge[]) =>
                      updateStudioStore((prev) =>
                        prev.workspace
                          ? { ...prev, workspace: { ...prev.workspace, edges: nextEdges } }
                          : prev
                      )
                    }
                    onQuickAddNode={handleQuickAddNode}
                    onDeleteSelectedNode={handleDeleteSelectedNode}
                  />
                </div>

                <div className={`min-h-0 lg:h-full lg:overflow-hidden ${mobileTab === 'chat' ? 'block' : 'hidden'} lg:block`}>
                  <WorkspaceAiChat
                    messages={workspace.chatMessages}
                    isSending={isChatSending}
                    canUndo={undoStack.length > 0}
                    errorMessage={chatError}
                    onSendMessage={handleSendWorkspaceChat}
                    onUndoLastMutation={handleUndo}
                  />
                </div>
              </main>
            </>
          )}
        </div>

        <PrdDownloadModal
          open={isDownloadOpen}
          workspace={workspace}
          onClose={() => setIsDownloadOpen(false)}
        />
      </StudioShell>

      <ApiSettingsModal
        open={isSettingsOpen}
        settings={aiSettings}
        onSave={handleSaveApiSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0E0E0E]" />}>
      <WorkspaceContent />
    </Suspense>
  );
}
