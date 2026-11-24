'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock,
  Crosshair,
  Edit3,
  GripVertical,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { PrdinNode, RoadmapStatus, RoadmapTask, TaskPriority } from '@/lib/types/prdin';
import {
  ROADMAP_COLUMN_MAP,
  ROADMAP_COLUMNS,
  TASK_PRIORITY_META,
} from '@/lib/engine/roadmap-defaults';
import { TaskComposerForm } from './TaskComposerForm';

interface RoadmapBoardViewProps {
  tasks: RoadmapTask[];
  nodes: PrdinNode[];
  onBackToCanvas: () => void;
  onFocusNodeInCanvas: (nodeId: string) => void;
  onAddTask: (input: {
    title: string;
    description?: string;
    status: RoadmapStatus;
    priority: TaskPriority;
    linkedNodeId?: string;
  }) => void;
  onMoveTask: (taskId: string, nextStatus: RoadmapStatus) => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<Pick<RoadmapTask, 'title' | 'description' | 'priority' | 'failureReason'>>
  ) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMN_ICONS: Record<RoadmapStatus, React.ComponentType<{ className?: string }>> = {
  todo: CircleDashed,
  'in-progress': Clock,
  done: CheckCircle2,
  failed: XCircle,
};

interface ActiveDragState {
  taskId: string;
  sourceStatus: RoadmapStatus;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  overStatus: RoadmapStatus | null;
}

export function RoadmapBoardView({
  tasks,
  nodes,
  onBackToCanvas,
  onFocusNodeInCanvas,
  onAddTask,
  onMoveTask,
  onUpdateTask,
  onDeleteTask,
}: RoadmapBoardViewProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDefaultStatus, setComposerDefaultStatus] = useState<RoadmapStatus>('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFailureReason, setEditFailureReason] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const dragRef = useRef<ActiveDragState | null>(null);
  const activeHandleRef = useRef<HTMLButtonElement | null>(null);
  const tasksRef = useRef(tasks);
  const onMoveTaskRef = useRef(onMoveTask);

  useEffect(() => {
    tasksRef.current = tasks;
    onMoveTaskRef.current = onMoveTask;
  }, [tasks, onMoveTask]);

  const nodeTitleById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.data.title])),
    [nodes]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tasks, searchQuery, priorityFilter]);

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const totalCount = tasks.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const announceMove = (title: string, nextStatus: RoadmapStatus) => {
    setLiveAnnouncement('');
    window.setTimeout(() => {
      setLiveAnnouncement(
        `Task "${title}" dipindahkan ke kolom ${ROADMAP_COLUMN_MAP[nextStatus].label}.`
      );
    }, 30);
  };

  const isDragging = dragState !== null;

  useEffect(() => {
    if (!isDragging) return;

    const resolveDropColumn = (clientX: number, clientY: number): RoadmapStatus | null => {
      const el = document.elementFromPoint(clientX, clientY);
      const colEl = el?.closest<HTMLElement>('[data-roadmap-column]');
      const colId = colEl?.dataset.roadmapColumn as RoadmapStatus | undefined;
      return colId ?? null;
    };

    const cleanup = () => {
      dragRef.current = null;
      activeHandleRef.current = null;
      setDragState(null);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;

      const overStatus = resolveDropColumn(event.clientX, event.clientY);
      const updated: ActiveDragState = {
        ...current,
        dx: event.clientX - current.startX,
        dy: event.clientY - current.startY,
        overStatus,
      };
      dragRef.current = updated;
      setDragState(updated);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;

      const dropStatus = resolveDropColumn(event.clientX, event.clientY) ?? current.overStatus;
      const movedTask = tasksRef.current.find((t) => t.id === current.taskId);

      if (dropStatus && dropStatus !== current.sourceStatus && movedTask) {
        onMoveTaskRef.current(current.taskId, dropStatus);
        announceMove(movedTask.title, dropStatus);
      }
      cleanup();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      cleanup();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLiveAnnouncement('Pemindahan task dibatalkan.');
        cleanup();
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging]);

  const startHandleDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    task: RoadmapTask
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments without synthetic pointer capture
    }

    activeHandleRef.current = event.currentTarget;
    const initial: ActiveDragState = {
      taskId: task.id,
      sourceStatus: task.status,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      overStatus: task.status,
    };
    dragRef.current = initial;
    setDragState(initial);
  };

  const openEditor = (task: RoadmapTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditFailureReason(task.failureReason ?? '');
  };

  const saveEditor = (task: RoadmapTask) => {
    onUpdateTask(task.id, {
      title: editTitle.trim() || task.title,
      description: editDescription.trim() || undefined,
      failureReason: editFailureReason.trim() || undefined,
    });
    setEditingTaskId(null);
  };

  return (
    <section
      aria-label="Roadmap Detail Kanban Board"
      className={`flex min-h-0 flex-1 flex-col bg-[#0E0E0E] ${dragState ? 'roadmap-dragging' : ''
        }`}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Board Sub-Header */}
      <div className="border-b border-white/[0.08] bg-[#121215] px-5 py-3.5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBackToCanvas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1B1B20] px-3 py-1.5 text-xs font-semibold text-[#D4D4D8] hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Canvas
            </button>

            <div>
              <h2 className="text-sm font-semibold text-white">Roadmap Detail</h2>
              <p className="text-xs text-[#6E6E6E]">
                Seret kartu antar 4 tahap atau gunakan menu pindah status di tiap kartu.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-[#18181D] px-3 py-1 text-xs sm:inline-flex">
              <span className="font-semibold text-white">
                {doneCount}/{totalCount} Selesai
              </span>
              <span className="text-[#6E6E6E]">•</span>
              <span className="font-medium text-[#7DD3FC]">{completionPct}%</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#7C93C4]" />
              <label htmlFor="roadmap-search" className="sr-only">
                Cari task roadmap
              </label>
              <input
                id="roadmap-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari task..."
                className="w-40 rounded-lg border border-white/[0.1] bg-[#18181D] py-1.5 pr-2.5 pl-8 text-xs text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none sm:w-48"
              />
            </div>

            <label htmlFor="roadmap-priority-filter" className="sr-only">
              Filter prioritas task
            </label>
            <select
              id="roadmap-priority-filter"
              name="roadmap-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
              className="iris-select iris-select-sm rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <option value="all">Semua Prioritas</option>
              <option value="high">Prioritas Tinggi</option>
              <option value="medium">Prioritas Sedang</option>
              <option value="low">Prioritas Rendah</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setComposerDefaultStatus('todo');
                setIsComposerOpen((prev) => !prev);
              }}
              className="iris-btn-gradient inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Task
            </button>
          </div>
        </div>

        {isComposerOpen && (
          <div className="mx-auto mt-3 max-w-[1440px]">
            <TaskComposerForm
              nodes={nodes}
              defaultStatus={composerDefaultStatus}
              onAddTask={onAddTask}
              onCancel={() => setIsComposerOpen(false)}
            />
          </div>
        )}
      </div>

      {/* 4-Column Kanban Grid */}
      <div className="prdin-scroll min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_COLUMNS.map((col) => {
            const Icon = COLUMN_ICONS[col.id];
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isDropHighlight =
              dragState !== null &&
              dragState.overStatus === col.id &&
              dragState.sourceStatus !== col.id;

            return (
              <div
                key={col.id}
                data-roadmap-column={col.id}
                aria-label={`Kolom ${col.label}`}
                className={`roadmap-column flex min-h-[380px] flex-col rounded-2xl border p-3.5 transition-colors ${isDropHighlight
                  ? 'border-[#2F6BFF] bg-[#171E33] ring-2 ring-[#2F6BFF]/30'
                  : `border-white/[0.08] ${col.columnTintClass}`
                  }`}
              >
                {/* Column Header */}
                <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${col.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{col.label}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#6E6E6E]">{col.shortDesc}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-white/[0.1] bg-[#1C1C22] px-2 py-0.5 text-xs font-bold text-white">
                      {colTasks.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setComposerDefaultStatus(col.id);
                        setIsComposerOpen(true);
                      }}
                      aria-label={`Tambah task di ${col.label}`}
                      title={`Tambah task ke ${col.label}`}
                      className="rounded-lg border border-white/[0.1] bg-[#1C1C22] p-1 text-[#8C8C8C] hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards List */}
                <div className="mt-3 flex-1 space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div
                      className={`flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs ${isDropHighlight
                        ? 'border-[#2F6BFF] bg-[#2F6BFF]/10 font-medium text-[#93C5FD]'
                        : 'border-white/[0.1] bg-[#151519]/60 text-[#6E6E6E]'
                        }`}
                    >
                      {isDropHighlight
                        ? `Lepaskan di sini untuk pindah ke ${col.label}`
                        : `Belum ada task di ${col.label}. Seret kartu ke sini atau klik + di atas.`}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isDraggingThis = dragState?.taskId === task.id;
                      const isEditing = editingTaskId === task.id;
                      const linkedTitle = task.linkedNodeId
                        ? nodeTitleById.get(task.linkedNodeId)
                        : undefined;
                      const priorityMeta = TASK_PRIORITY_META[task.priority];

                      return (
                        <article
                          key={task.id}
                          style={
                            isDraggingThis
                              ? {
                                transform: `translate3d(${dragState.dx}px, ${dragState.dy}px, 0) scale(1.02)`,
                                zIndex: 50,
                                pointerEvents: 'none',
                              }
                              : undefined
                          }
                          className={`relative rounded-xl border bg-[#1A1A20] p-3 transition-shadow ${isDraggingThis
                            ? 'border-[#2F6BFF] shadow-2xl ring-2 ring-[#2F6BFF]/35'
                            : 'border-white/[0.08] hover:border-white/[0.18]'
                            }`}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                aria-label="Edit judul task"
                                className="w-full rounded-lg border border-[#2F6BFF] bg-[#101014] px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none"
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Catatan singkat..."
                                aria-label="Edit deskripsi task"
                                className="w-full rounded-lg border border-white/[0.1] bg-[#101014] px-2.5 py-1.5 text-xs text-[#D4D4D8] focus:border-[#2F6BFF] focus:outline-none"
                              />
                              {task.status === 'failed' && (
                                <input
                                  type="text"
                                  value={editFailureReason}
                                  onChange={(e) => setEditFailureReason(e.target.value)}
                                  placeholder="Alasan gagal / kendala..."
                                  aria-label="Edit alasan gagal"
                                  className="w-full rounded-lg border border-[#5A4CF5]/50 bg-[#5A4CF5]/10 px-2.5 py-1.5 text-xs text-[#C4B5FD] focus:outline-none"
                                />
                              )}
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#8C8C8C] hover:text-white"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveEditor(task)}
                                  className="iris-btn-gradient inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
                                >
                                  <Check className="h-3 w-3" />
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Card Top Row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onPointerDown={(e) => startHandleDrag(e, task)}
                                    aria-label={`Seret task ${task.title}`}
                                    title="Seret ke kolom roadmap lain"
                                    className="roadmap-drag-handle inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6BFF]"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.badgeClass}`}
                                  >
                                    {priorityMeta.label}
                                  </span>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditor(task)}
                                    aria-label={`Edit task ${task.title}`}
                                    className="rounded-md p-1 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
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

                              {task.status === 'failed' && (
                                <div className="mt-2 rounded-lg border border-[#5A4CF5]/40 bg-[#5A4CF5]/15 px-2.5 py-1.5 text-[11px] text-[#C4B5FD]">
                                  {task.failureReason ? (
                                    <span>
                                      <strong className="text-white">Kendala:</strong>{' '}
                                      {task.failureReason}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openEditor(task)}
                                      className="font-medium underline"
                                    >
                                      + Tambah alasan gagal
                                    </button>
                                  )}
                                </div>
                              )}

                              {linkedTitle && task.linkedNodeId && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => onFocusNodeInCanvas(task.linkedNodeId!)}
                                    className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/[0.08] bg-[#121216] px-2 py-0.5 text-[10px] font-medium text-[#D4D4D8] hover:border-[#2F6BFF]/60 hover:text-white"
                                  >
                                    <Crosshair className="h-3 w-3 shrink-0 text-[#2F6BFF]" />
                                    <span className="truncate">{linkedTitle}</span>
                                  </button>
                                </div>
                              )}

                              {/* Accessible Status Transfer Control */}
                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5">
                                <label
                                  htmlFor={`move-${task.id}`}
                                  className="text-[10px] font-semibold text-[#6E6E6E]"
                                >
                                  Status:
                                </label>
                                <select
                                  id={`move-${task.id}`}
                                  name={`move-${task.id}`}
                                  value={task.status}
                                  onChange={(e) => {
                                    const nextStatus = e.target.value as RoadmapStatus;
                                    onMoveTask(task.id, nextStatus);
                                    announceMove(task.title, nextStatus);
                                  }}
                                  aria-label={`Pindahkan status task ${task.title}`}
                                  className="iris-select iris-select-sm min-w-0 flex-1 rounded-lg px-2.5 py-1 text-[11px] font-medium"
                                >
                                  {ROADMAP_COLUMNS.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
