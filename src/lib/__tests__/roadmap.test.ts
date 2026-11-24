import { describe, expect, it } from 'vitest';
import {
  ROADMAP_COLUMNS,
  buildInitialRoadmapTasks,
  createRoadmapTask,
} from '@/lib/engine/roadmap-defaults';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';
import { compilePrdMarkdown } from '@/lib/export/markdown-exporter';

describe('roadmap defaults and PRD export integration', () => {
  it('defines the 4 required roadmap columns in exact lifecycle order', () => {
    expect(ROADMAP_COLUMNS.map((c) => c.label)).toEqual([
      'Belum Dikerjakan',
      'Sedang Dikerjakan',
      'Selesai',
      'Gagal',
    ]);
  });

  it('seeds initial todo roadmap tasks aligned with UI/UX Proses and Aplikasi modes', () => {
    const uxDiscovery = createInitialDiscoveryState('ui-ux-process');
    const uxHydrated = hydrateQuestionsFromStoryFallback(
      'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja lokal.',
      uxDiscovery.questions,
      'ui-ux-process'
    );
    uxDiscovery.q1Summary = uxHydrated.q1Summary;
    uxDiscovery.questions = uxHydrated.questions;
    uxDiscovery.questions.q2.selectedTagIds = [uxDiscovery.questions.q2.tags[0].id];
    uxDiscovery.questions.q3.selectedTagIds = uxDiscovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
    uxDiscovery.questions.q4.selectedTagIds = [uxDiscovery.questions.q4.tags[0].id];
    uxDiscovery.questions.q5.selectedTagIds = [uxDiscovery.questions.q5.tags[0].id];

    const workspace = buildWorkspaceStateFromOutput(
      uxDiscovery,
      buildWorkspaceFallback(uxDiscovery),
      'smart-fallback'
    );

    expect(workspace.roadmapTasks.length).toBeGreaterThanOrEqual(5);
    expect(workspace.roadmapTasks.every((t) => t.status === 'todo')).toBe(true);
    expect(workspace.roadmapTasks.some((t) => t.title.includes('Rancang & lengkapi'))).toBe(true);

    const appTasks = buildInitialRoadmapTasks(workspace.nodes, 'application');
    expect(appTasks.some((t) => t.title.includes('Bangun modul:'))).toBe(true);
  });

  it('exports all 4 roadmap statuses and failure reasons into PRD Markdown', () => {
    const discovery = createInitialDiscoveryState('website');
    const hydrated = hydrateQuestionsFromStoryFallback(
      'Website booking studio foto untuk klien wedding.',
      discovery.questions,
      'website'
    );
    discovery.q1Summary = hydrated.q1Summary;
    discovery.questions = hydrated.questions;
    discovery.questions.q2.selectedTagIds = [discovery.questions.q2.tags[0].id];
    discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 2).map((t) => t.id);
    discovery.questions.q4.selectedTagIds = [discovery.questions.q4.tags[0].id];
    discovery.questions.q5.selectedTagIds = [discovery.questions.q5.tags[0].id];

    const workspace = buildWorkspaceStateFromOutput(
      discovery,
      buildWorkspaceFallback(discovery),
      'smart-fallback'
    );

    const customInProgress = createRoadmapTask({
      title: 'Integrasi kalender slot real-time',
      status: 'in-progress',
      priority: 'high',
    });
    const customDone = createRoadmapTask({
      title: 'Wireframe halaman paket foto',
      status: 'done',
      priority: 'medium',
    });
    const customFailed = createRoadmapTask({
      title: 'Sync otomatis Instagram feed',
      status: 'failed',
      priority: 'low',
      failureReason: 'API token klien kadaluarsa',
    });

    workspace.roadmapTasks = [
      ...workspace.roadmapTasks,
      customInProgress,
      customDone,
      customFailed,
    ];

    const md = compilePrdMarkdown(workspace);
    expect(md).toContain('## 6. Roadmap & Status Task');
    expect(md).toContain('### Belum Dikerjakan');
    expect(md).toContain('### Sedang Dikerjakan (1)');
    expect(md).toContain('### Selesai (1)');
    expect(md).toContain('### Gagal (1)');
    expect(md).toContain('- [x] **Wireframe halaman paket foto**');
    expect(md).toContain('API token klien kadaluarsa');
  });
});
