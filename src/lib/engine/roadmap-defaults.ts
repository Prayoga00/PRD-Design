import type {
  PrdPurpose,
  PrdinNode,
  RoadmapStatus,
  RoadmapTask,
  TaskPriority,
} from '@/lib/types/prdin';

export interface RoadmapColumnMeta {
  id: RoadmapStatus;
  label: string;
  shortDesc: string;
  badgeClass: string;
  columnTintClass: string;
  accentBorderClass: string;
}

export const ROADMAP_COLUMNS: RoadmapColumnMeta[] = [
  {
    id: 'todo',
    label: 'Belum Dikerjakan',
    shortDesc: 'Daftar task siap mulai',
    badgeClass: 'bg-white/[0.08] text-[#D4D4D8] border border-white/[0.08]',
    columnTintClass: 'bg-[#131316]',
    accentBorderClass: 'border-white/15',
  },
  {
    id: 'in-progress',
    label: 'Sedang Dikerjakan',
    shortDesc: 'Aktif dikerjakan sekarang',
    badgeClass: 'bg-[#2F6BFF]/20 text-[#93C5FD] border border-[#2F6BFF]/35',
    columnTintClass: 'bg-[#121622]',
    accentBorderClass: 'border-[#2F6BFF]/40',
  },
  {
    id: 'done',
    label: 'Selesai',
    shortDesc: 'Sudah terverifikasi tuntas',
    badgeClass: 'bg-[#38BDF8]/15 text-[#7DD3FC] border border-[#38BDF8]/30',
    columnTintClass: 'bg-[#111920]',
    accentBorderClass: 'border-[#38BDF8]/35',
  },
  {
    id: 'failed',
    label: 'Gagal',
    shortDesc: 'Terhambat / perlu evaluasi',
    badgeClass: 'bg-[#5A4CF5]/22 text-[#C4B5FD] border border-[#5A4CF5]/40',
    columnTintClass: 'bg-[#161321]',
    accentBorderClass: 'border-[#5A4CF5]/45',
  },
];

export const ROADMAP_COLUMN_MAP: Record<RoadmapStatus, RoadmapColumnMeta> = {
  todo: ROADMAP_COLUMNS[0],
  'in-progress': ROADMAP_COLUMNS[1],
  done: ROADMAP_COLUMNS[2],
  failed: ROADMAP_COLUMNS[3],
};

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  high: {
    label: 'Tinggi',
    badgeClass: 'bg-[#5A4CF5]/25 text-[#C4B5FD] border border-[#5A4CF5]/35',
  },
  medium: {
    label: 'Sedang',
    badgeClass: 'bg-[#2F6BFF]/20 text-[#93C5FD] border border-[#2F6BFF]/30',
  },
  low: {
    label: 'Rendah',
    badgeClass: 'bg-white/[0.07] text-[#8C8C8C] border border-white/[0.08]',
  },
};

export function createRoadmapTask(input: {
  title: string;
  description?: string;
  status?: RoadmapStatus;
  priority?: TaskPriority;
  linkedNodeId?: string;
  failureReason?: string;
}): RoadmapTask {
  const now = Date.now();
  return {
    id: `task-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    status: input.status ?? 'todo',
    priority: input.priority ?? 'medium',
    linkedNodeId: input.linkedNodeId || undefined,
    failureReason: input.failureReason?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function formatTaskTitleForNode(node: PrdinNode, prdPurpose: PrdPurpose): string {
  const cleanTitle = node.data.title.replace(/^\d+\.\s*/, '').trim();
  if (prdPurpose === 'ui-ux-process') {
    return `Rancang & lengkapi ${cleanTitle}`;
  }
  if (prdPurpose === 'application') {
    return `Bangun modul: ${cleanTitle}`;
  }
  return `Implementasi halaman/alur: ${cleanTitle}`;
}

/**
 * Generates initial actionable roadmap tasks from the workspace's Business Flow nodes,
 * seeded in the "Belum Dikerjakan" column so users can drag-and-drop or add missing tasks.
 */
export function buildInitialRoadmapTasks(
  nodes: PrdinNode[],
  prdPurpose: PrdPurpose = 'website'
): RoadmapTask[] {
  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');
  const now = Date.now();

  const tasks: RoadmapTask[] = flowNodes.map((node, index) => {
    const priority: TaskPriority =
      node.data.kind === 'flow-start' || node.data.kind === 'flow-feature'
        ? 'high'
        : node.data.kind === 'flow-decision'
        ? 'medium'
        : 'low';

    return {
      id: `task-init-${index + 1}-${node.id}`,
      title: formatTaskTitleForNode(node, prdPurpose),
      description: node.data.details.purpose,
      status: 'todo',
      priority,
      linkedNodeId: node.id,
      createdAt: now + index,
      updatedAt: now + index,
    };
  });

  // Always include at least 1 UX Research validation task if flow list is short
  const personaNode = nodes.find((n) => n.id === 'ux-persona');
  if (personaNode) {
    tasks.unshift({
      id: `task-init-ux-persona`,
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Validasi Persona & Pain Point dengan Target User'
          : 'Konfirmasi Riset Persona & Alur Awal ke Stakeholder',
      description: personaNode.data.subtitle,
      status: 'todo',
      priority: 'high',
      linkedNodeId: personaNode.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  return tasks;
}
