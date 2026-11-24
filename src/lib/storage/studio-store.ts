import type {
  AiSettings,
  DiscoveryState,
  PrdPurpose,
  RecentProjectEntry,
  WorkspaceState,
} from '@/lib/types/prdin';
import { createInitialDiscoveryState } from '@/lib/engine/smart-fallback';
import { buildInitialRoadmapTasks } from '@/lib/engine/roadmap-defaults';

const STORAGE_KEY = 'prdin.studio.state.v1';
const SETTINGS_STORAGE_KEY = 'prdin.ai.settings.v1';
const HISTORY_STORAGE_KEY = 'prdin.studio.history.v1';
const MAX_HISTORY_ITEMS = 12;

export interface StudioStoreSnapshot {
  view: 'discovery' | 'workspace';
  discovery: DiscoveryState;
  workspace: WorkspaceState | null;
  aiSettings: AiSettings;
  recentProjects: RecentProjectEntry[];
}

const SERVER_SNAPSHOT: StudioStoreSnapshot = {
  view: 'discovery',
  discovery: createInitialDiscoveryState(),
  workspace: null,
  aiSettings: { provider: 'auto', apiKey: '' },
  recentProjects: [],
};

let clientSnapshot: StudioStoreSnapshot | null = null;
const listeners = new Set<() => void>();

function extractStoryPreview(discovery: DiscoveryState, workspace: WorkspaceState | null): string {
  const userMessages = discovery.q1Messages.filter((m) => m.role === 'user');
  const latest = userMessages[userMessages.length - 1]?.content?.trim();
  if (latest) return latest;
  if (discovery.q1Summary?.coreGoal) return discovery.q1Summary.coreGoal;
  if (workspace?.projectTitle) return `Proyek PRD: ${workspace.projectTitle}`;
  return 'Sesi perancangan PRD';
}

function deriveHistoryEntry(
  discovery: DiscoveryState,
  workspace: WorkspaceState | null
): RecentProjectEntry | null {
  if (!workspace && !discovery.q1Summary && discovery.q1Messages.every((m) => m.role !== 'user')) {
    return null;
  }

  const id = workspace?.projectId ?? `draft-${discovery.prdPurpose}-${discovery.q1Summary?.productNameSuggestion ?? 'session'}`;
  const title =
    workspace?.projectTitle ??
    discovery.q1Summary?.productNameSuggestion ??
    'Draft Ask PRD';

  return {
    id,
    title,
    prdPurpose: workspace?.discovery.prdPurpose ?? discovery.prdPurpose ?? 'website',
    storyPreview: extractStoryPreview(discovery, workspace),
    updatedAt: Date.now(),
    nodeCount: workspace?.nodes.length ?? 0,
    taskCount: workspace?.roadmapTasks?.length ?? 0,
    discovery,
    workspace,
  };
}

function upsertHistoryList(
  list: RecentProjectEntry[],
  entry: RecentProjectEntry | null
): RecentProjectEntry[] {
  if (!entry) return list;
  const filtered = list.filter((item) => item.id !== entry.id);
  return [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
}

function readInitialClientSnapshot(): StudioStoreSnapshot {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

    let view: 'discovery' | 'workspace' = 'discovery';
    let discovery = createInitialDiscoveryState();
    let workspace: WorkspaceState | null = null;
    let aiSettings: AiSettings = { provider: 'auto', apiKey: '' };
    let recentProjects: RecentProjectEntry[] = [];

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudioStoreSnapshot>;
      if (parsed.discovery) {
        const rawQuestions = parsed.discovery.questions;
        const upgradedQuestions = rawQuestions
          ? {
              q2: { ...rawQuestions.q2, selectionMode: 'unlimited' as const, maxSelect: null },
              q3: { ...rawQuestions.q3, selectionMode: 'unlimited' as const, maxSelect: null },
              q4: { ...rawQuestions.q4, selectionMode: 'unlimited' as const, maxSelect: null },
              q5: { ...rawQuestions.q5, selectionMode: 'unlimited' as const, maxSelect: null },
            }
          : createInitialDiscoveryState(parsed.discovery.prdPurpose ?? 'website').questions;
        discovery = {
          ...parsed.discovery,
          prdPurpose: parsed.discovery.prdPurpose ?? 'website',
          questions: upgradedQuestions,
        };
      }
      if (parsed.workspace) {
        const ws = parsed.workspace;
        const prdPurpose = ws.discovery?.prdPurpose ?? discovery.prdPurpose ?? 'website';
        workspace = {
          ...ws,
          roadmapTasks: Array.isArray(ws.roadmapTasks)
            ? ws.roadmapTasks
            : buildInitialRoadmapTasks(ws.nodes ?? [], prdPurpose),
        };
      }
      if (parsed.view === 'workspace' && parsed.workspace) view = 'workspace';
    }

    if (rawSettings) {
      const parsedSettings = JSON.parse(rawSettings) as Partial<AiSettings>;
      if (parsedSettings.provider) {
        aiSettings = {
          provider: parsedSettings.provider,
          apiKey: parsedSettings.apiKey ?? '',
        };
      }
    }

    if (rawHistory) {
      const parsedHistory = JSON.parse(rawHistory) as RecentProjectEntry[];
      if (Array.isArray(parsedHistory)) {
        recentProjects = parsedHistory.slice(0, MAX_HISTORY_ITEMS);
      }
    }

    const activeEntry = deriveHistoryEntry(discovery, workspace);
    if (activeEntry && !recentProjects.some((r) => r.id === activeEntry.id)) {
      recentProjects = upsertHistoryList(recentProjects, activeEntry);
    }

    return { view, discovery, workspace, aiSettings, recentProjects };
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function persistSnapshot(next: StudioStoreSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        view: next.view,
        discovery: next.discovery,
        workspace: next.workspace,
      })
    );
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next.aiSettings));
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next.recentProjects));
  } catch {
    // Ignore quota errors
  }
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getStudioSnapshot(): StudioStoreSnapshot {
  if (!clientSnapshot) {
    clientSnapshot = readInitialClientSnapshot();
  }
  return clientSnapshot;
}

export function getServerStudioSnapshot(): StudioStoreSnapshot {
  return SERVER_SNAPSHOT;
}

export function subscribeStudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateStudioStore(
  updater: (prev: StudioStoreSnapshot) => StudioStoreSnapshot
): StudioStoreSnapshot {
  const current = getStudioSnapshot();
  const nextRaw = updater(current);
  const entry = deriveHistoryEntry(nextRaw.discovery, nextRaw.workspace);
  const next: StudioStoreSnapshot = {
    ...nextRaw,
    recentProjects: upsertHistoryList(nextRaw.recentProjects ?? current.recentProjects, entry),
  };
  clientSnapshot = next;
  persistSnapshot(next);
  emit();
  return next;
}

export function startNewDiscoverySession(purpose: PrdPurpose): StudioStoreSnapshot {
  const current = getStudioSnapshot();
  const archivedEntry = deriveHistoryEntry(current.discovery, current.workspace);
  const next: StudioStoreSnapshot = {
    view: 'discovery',
    discovery: createInitialDiscoveryState(purpose),
    workspace: null,
    aiSettings: current.aiSettings,
    recentProjects: upsertHistoryList(current.recentProjects, archivedEntry),
  };
  clientSnapshot = next;
  persistSnapshot(next);
  emit();
  return next;
}

export function loadProjectFromHistory(projectId: string): RecentProjectEntry | null {
  const current = getStudioSnapshot();
  const match = current.recentProjects.find((p) => p.id === projectId);
  if (!match) return null;

  const next: StudioStoreSnapshot = {
    view: match.workspace ? 'workspace' : 'discovery',
    discovery: match.discovery,
    workspace: match.workspace,
    aiSettings: current.aiSettings,
    recentProjects: current.recentProjects,
  };
  clientSnapshot = next;
  persistSnapshot(next);
  emit();
  return match;
}

export function deleteProjectFromHistory(projectId: string): void {
  const current = getStudioSnapshot();
  const next: StudioStoreSnapshot = {
    ...current,
    recentProjects: current.recentProjects.filter((p) => p.id !== projectId),
  };
  clientSnapshot = next;
  persistSnapshot(next);
  emit();
}

export function resetStudioStore(): void {
  const current = getStudioSnapshot();
  const archivedEntry = deriveHistoryEntry(current.discovery, current.workspace);
  const fresh: StudioStoreSnapshot = {
    view: 'discovery',
    discovery: createInitialDiscoveryState(),
    workspace: null,
    aiSettings: current.aiSettings,
    recentProjects: upsertHistoryList(current.recentProjects, archivedEntry),
  };
  clientSnapshot = fresh;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(fresh.recentProjects));
    } catch {
      // Ignore
    }
  }
  emit();
}
