'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Crosshair,
  Edit3,
  FileText,
  Kanban,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  PlanCategory,
  PlanSection,
  PrdinNode,
  RoadmapStatus,
  RoadmapTask,
  TaskPriority,
} from '@/lib/types/prdin';
import {
  ROADMAP_COLUMN_MAP,
  ROADMAP_COLUMNS,
  TASK_PRIORITY_META,
} from '@/lib/engine/roadmap-defaults';
import { TaskComposerForm } from './TaskComposerForm';

interface PlanTextPanelProps {
  planSections: PlanSection[];
  nodes: PrdinNode[];
  roadmapTasks: RoadmapTask[];
  selectedNodeId: string | null;
  onSelectNodeFromPlan: (nodeId: string) => void;
  onUpdateSectionContent: (sectionId: string, nextContent: string) => void;
  onAddTask: (input: {
    title: string;
    description?: string;
    status: RoadmapStatus;
    priority: TaskPriority;
    linkedNodeId?: string;
  }) => void;
  onMoveTask: (taskId: string, nextStatus: RoadmapStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenRoadmapDetail: () => void;
}

type PlanTabId = 'all' | PlanCategory | 'roadmap';

const FILTER_TABS: { id: PlanTabId; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'business-flow', label: 'Flow Bisnis' },
  { id: 'ux-research', label: 'UX Research' },
  { id: 'summary', label: 'Ringkasan' },
  { id: 'roadmap', label: 'Task List' },
];

export function PlanTextPanel({
  planSections,
  nodes,
  roadmapTasks,
  selectedNodeId,
  onSelectNodeFromPlan,
  onUpdateSectionContent,
  onAddTask,
  onMoveTask,
  onDeleteTask,
  onOpenRoadmapDetail,
}: PlanTextPanelProps) {
  const [activeFilter, setActiveFilter] = useState<PlanTabId>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [isTaskComposerOpen, setIsTaskComposerOpen] = useState(false);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!selectedNodeId || activeFilter === 'roadmap') return;
    const matchingSection = planSections.find((s) => s.linkedNodeId === selectedNodeId);
    if (!matchingSection) return;

    const el = cardRefs.current[matchingSection.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedNodeId, planSections, activeFilter]);

  const visibleSections = planSections.filter((sec) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'summary') {
      return sec.category === 'summary' || sec.category === 'non-goals' || sec.category === 'specs';
    }
    return sec.category === activeFilter;
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const doneTaskCount = roadmapTasks.filter((t) => t.status === 'done').length;

  return (
    <aside
      aria-label="Plan Text Perencanaan"
      className="flex h-full min-h-0 flex-col border-r border-white/[0.08] bg-[#121215]"
    >
      {/* Header */}
      <div className="border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2F6BFF]" />
            <h2 className="text-sm font-semibold text-white">Plan Text</h2>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-[#1B1B20] px-2 py-0.5 text-[11px] font-medium text-[#8C8C8C]">
            {activeFilter === 'roadmap'
              ? `${roadmapTasks.length} task`
              : `${planSections.length} bagian`}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#6E6E6E]">
          Detail rencana bisnis, UX research, &amp; daftar task roadmap dari canvas.
        </p>

        {/* Filter Chips */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${active
                  ? 'bg-white text-[#0E0E0E]'
                  : 'bg-[#1B1B20] text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white'
                  }`}
              >
                {tab.label}
                {tab.id === 'roadmap' && (
                  <span className="ml-1 text-[10px] opacity-75">({roadmapTasks.length})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="prdin-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {activeFilter === 'roadmap' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#17171C] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">Roadmap Task List</div>
                  <p className="text-[11px] text-[#8C8C8C]">
                    {doneTaskCount} dari {roadmapTasks.length} task selesai
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenRoadmapDetail}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0E0E0E] hover:bg-white/90"
                >
                  <Kanban className="h-3.5 w-3.5 text-[#2F6BFF]" />
                  Roadmap Detail
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsTaskComposerOpen((prev) => !prev)}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2F6BFF]/55 bg-[#2F6BFF]/10 px-3 py-1.5 text-xs font-semibold text-[#93C5FD] hover:bg-[#2F6BFF]/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Task Baru
              </button>
            </div>

            {isTaskComposerOpen && (
              <TaskComposerForm
                nodes={nodes}
                compact
                onAddTask={onAddTask}
                onCancel={() => setIsTaskComposerOpen(false)}
              />
            )}

            {roadmapTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/[0.1] p-4 text-center text-xs text-[#8C8C8C]">
                Belum ada task di roadmap. Klik &ldquo;Tambah Task Baru&rdquo; di atas untuk menambah daftar pekerjaan.
              </p>
            ) : (
              roadmapTasks.map((task) => {
                const statusMeta = ROADMAP_COLUMN_MAP[task.status];
                const priorityMeta = TASK_PRIORITY_META[task.priority];
                const linkedNode = task.linkedNodeId ? nodeById.get(task.linkedNodeId) : undefined;

                return (
                  <article
                    key={task.id}
                    className="rounded-xl border border-white/[0.08] bg-[#18181D] p-3 transition-colors hover:border-white/[0.16]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${priorityMeta.badgeClass}`}
                        >
                          {priorityMeta.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {linkedNode && (
                          <button
                            type="button"
                            onClick={() => onSelectNodeFromPlan(linkedNode.id)}
                            title="Sorot tahap di Canvas"
                            aria-label={`Sorot ${linkedNode.data.title} di Canvas`}
                            className="rounded-md p-1 text-[#8C8C8C] hover:bg-[#2F6BFF]/20 hover:text-[#93C5FD]"
                          >
                            <Crosshair className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`Hapus task ${task.title}`}
                          className="rounded-md p-1 text-[#8C8C8C] hover:bg-[#5A4CF5]/20 hover:text-[#C4B5FD]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-2 text-xs font-semibold leading-snug text-white">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-[11px] leading-relaxed text-[#8C8C8C]">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2 border-t border-white/[0.07] pt-2">
                      <label
                        htmlFor={`panel-status-${task.id}`}
                        className="text-[10px] font-semibold text-[#6E6E6E]"
                      >
                        Status:
                      </label>
                      <select
                        id={`panel-status-${task.id}`}
                        value={task.status}
                        onChange={(e) => onMoveTask(task.id, e.target.value as RoadmapStatus)}
                        className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-[#121216] px-2 py-1 text-[11px] font-medium text-white focus:border-[#2F6BFF] focus:outline-none"
                      >
                        {ROADMAP_COLUMNS.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : visibleSections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] p-4 text-center text-xs text-[#8C8C8C]">
            Belum ada bagian untuk filter ini. Pilih tab &ldquo;Semua&rdquo; untuk melihat seluruh dokumen rencana.
          </p>
        ) : (
          visibleSections.map((sec) => {
            const isLinkedSelected = Boolean(sec.linkedNodeId && sec.linkedNodeId === selectedNodeId);
            const linkedNode = sec.linkedNodeId ? nodeById.get(sec.linkedNodeId) : undefined;
            const isEditing = editingId === sec.id;

            return (
              <section
                key={sec.id}
                ref={(el) => {
                  cardRefs.current[sec.id] = el;
                }}
                className={`rounded-xl border p-3.5 transition-all ${isLinkedSelected
                  ? 'border-[#2F6BFF]/70 bg-[#171E33] ring-2 ring-[#2F6BFF]/25'
                  : 'border-white/[0.08] bg-[#17171C] hover:border-white/[0.16]'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${sec.category === 'ux-research'
                        ? 'bg-[#38BDF8]/15 text-[#7DD3FC]'
                        : sec.category === 'business-flow'
                          ? 'bg-[#2F6BFF]/20 text-[#93C5FD]'
                          : 'bg-white/[0.08] text-[#D4D4D8]'
                        }`}
                    >
                      {sec.category === 'ux-research'
                        ? 'UX Research'
                        : sec.category === 'business-flow'
                          ? 'Flow Kerja Bisnis'
                          : sec.category === 'non-goals'
                            ? 'Scope / Non-Goals'
                            : 'Ringkasan'}
                    </span>
                    <h3 className="mt-1.5 text-xs font-semibold text-white">{sec.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    {linkedNode && (
                      <button
                        type="button"
                        onClick={() => onSelectNodeFromPlan(linkedNode.id)}
                        title="Sorot node ini di Canvas Tengah"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#1D1D24] px-2 py-1 text-[11px] font-medium text-[#D4D4D8] hover:border-[#2F6BFF]/60 hover:text-white"
                      >
                        <Crosshair className="h-3 w-3 text-[#2F6BFF]" />
                        Canvas
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(sec.id);
                          setEditDraft(sec.content);
                        }}
                        aria-label={`Edit bagian ${sec.title}`}
                        title="Edit teks rencana"
                        className="rounded-lg p-1.5 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      rows={5}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full rounded-lg border border-[#2F6BFF] bg-[#101014] p-2.5 text-xs leading-relaxed text-white focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#8C8C8C] hover:text-white"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateSectionContent(sec.id, editDraft.trim() || sec.content);
                          setEditingId(null);
                        }}
                        className="iris-btn-gradient inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#A1A1AA]">
                      {sec.content}
                    </div>

                    {linkedNode && (
                      <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#121216] p-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                          <Layers className="h-3.5 w-3.5 text-[#2F6BFF]" />
                          Komponen UI untuk Desainer
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {linkedNode.data.details.uiComponents.map((comp) => (
                            <span
                              key={comp}
                              className="rounded-md border border-white/[0.06] bg-[#1B1B22] px-2 py-0.5 text-[10px] font-medium text-[#D4D4D8]"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
