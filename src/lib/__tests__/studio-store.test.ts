import { describe, expect, it } from 'vitest';
import {
  deleteProjectFromHistory,
  getStudioSnapshot,
  loadProjectFromHistory,
  resetStudioStore,
  startNewDiscoverySession,
  updateStudioStore,
} from '@/lib/storage/studio-store';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';

describe('studio-store multi-project history', () => {
  it('archives active workspace when starting a new discovery session and allows reloading it', () => {
    resetStudioStore();
    const firstSession = startNewDiscoverySession('website');
    const story = 'Website booking studio foto agar klien bisa cek jadwal kosong.';
    const hydrated = hydrateQuestionsFromStoryFallback(
      story,
      firstSession.discovery.questions,
      'website'
    );
    const completedDiscovery = {
      ...firstSession.discovery,
      q1Messages: [{ id: 'u1', role: 'user' as const, content: story }],
      q1Summary: hydrated.q1Summary,
      questions: {
        ...hydrated.questions,
        q2: { ...hydrated.questions.q2, selectedTagIds: [hydrated.questions.q2.tags[0].id] },
        q3: {
          ...hydrated.questions.q3,
          selectedTagIds: hydrated.questions.q3.tags.slice(0, 3).map((t) => t.id),
        },
        q4: { ...hydrated.questions.q4, selectedTagIds: [hydrated.questions.q4.tags[0].id] },
        q5: { ...hydrated.questions.q5, selectedTagIds: [hydrated.questions.q5.tags[0].id] },
      },
    };
    const ws = buildWorkspaceStateFromOutput(
      completedDiscovery,
      buildWorkspaceFallback(completedDiscovery),
      'smart-fallback'
    );

    updateStudioStore((prev) => ({
      ...prev,
      view: 'workspace',
      discovery: completedDiscovery,
      workspace: ws,
    }));

    const afterStartNew = startNewDiscoverySession('application');
    expect(afterStartNew.discovery.prdPurpose).toBe('application');
    expect(afterStartNew.workspace).toBeNull();
    expect(afterStartNew.recentProjects.some((p) => p.id === ws.projectId)).toBe(true);

    const reloaded = loadProjectFromHistory(ws.projectId);
    expect(reloaded?.id).toBe(ws.projectId);
    expect(getStudioSnapshot().workspace?.projectId).toBe(ws.projectId);

    deleteProjectFromHistory(ws.projectId);
    expect(getStudioSnapshot().recentProjects.some((p) => p.id === ws.projectId)).toBe(false);
  });
});
