'use client';

import React, { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PrdinNode, RoadmapStatus, TaskPriority } from '@/lib/types/prdin';
import { ROADMAP_COLUMNS } from '@/lib/engine/roadmap-defaults';

interface TaskComposerFormProps {
  nodes: PrdinNode[];
  defaultStatus?: RoadmapStatus;
  compact?: boolean;
  onAddTask: (input: {
    title: string;
    description?: string;
    status: RoadmapStatus;
    priority: TaskPriority;
    linkedNodeId?: string;
  }) => void;
  onCancel?: () => void;
}

export function TaskComposerForm({
  nodes,
  defaultStatus = 'todo',
  compact = false,
  onAddTask,
  onCancel,
}: TaskComposerFormProps) {
  const uid = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<RoadmapStatus>(defaultStatus);
  const [linkedNodeId, setLinkedNodeId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleaned = title.trim();
    if (!cleaned) return;
    onAddTask({
      title: cleaned,
      description: description.trim() || undefined,
      status,
      priority,
      linkedNodeId: linkedNodeId || undefined,
    });
    setTitle('');
    setDescription('');
    setLinkedNodeId('');
    onCancel?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-[#2F6BFF]/40 bg-[#141826] ${
        compact ? 'space-y-2.5 p-3' : 'space-y-3 p-4'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-white">Tambah Task Baru ke Roadmap</span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup form tambah task"
            className="rounded-lg p-1 text-[#8C8C8C] hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-title`} className="block text-[11px] font-semibold text-[#D4D4D8]">
          Judul task
        </label>
        <input
          id={`${uid}-title`}
          type="text"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Buat wireframe halaman checkout error state"
          className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#0F1016] px-3 py-1.5 text-xs text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-desc`} className="block text-[11px] font-semibold text-[#D4D4D8]">
          Detail / catatan singkat (opsional)
        </label>
        <input
          id={`${uid}-desc`}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Pastikan ada tombol ulangi bayar QRIS"
          className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#0F1016] px-3 py-1.5 text-xs text-white placeholder:text-[#6E6E6E] focus:border-[#2F6BFF] focus:outline-none"
        />
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div>
          <label htmlFor={`${uid}-status`} className="block text-[11px] font-semibold text-[#D4D4D8]">
            Kolom status
          </label>
          <select
            id={`${uid}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as RoadmapStatus)}
            className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#0F1016] px-2.5 py-1.5 text-xs text-white focus:border-[#2F6BFF] focus:outline-none"
          >
            {ROADMAP_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-priority`} className="block text-[11px] font-semibold text-[#D4D4D8]">
            Prioritas
          </label>
          <select
            id={`${uid}-priority`}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#0F1016] px-2.5 py-1.5 text-xs text-white focus:border-[#2F6BFF] focus:outline-none"
          >
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>
        </div>

        <div className={compact ? 'sm:col-span-2' : ''}>
          <label htmlFor={`${uid}-node`} className="block text-[11px] font-semibold text-[#D4D4D8]">
            Terkait tahap Canvas (opsional)
          </label>
          <select
            id={`${uid}-node`}
            value={linkedNodeId}
            onChange={(e) => setLinkedNodeId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#0F1016] px-2.5 py-1.5 text-xs text-white focus:border-[#2F6BFF] focus:outline-none"
          >
            <option value="">Umum / Lintas tahap</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#8C8C8C] hover:text-white"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={!title.trim()}
          className="iris-btn-gradient inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="h-3.5 w-3.5" />
          Simpan Task
        </button>
      </div>
    </form>
  );
}
