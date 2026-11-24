import { describe, expect, it } from 'vitest';
import {
  HydrateQuestionsLlmOutputSchema,
  WorkspaceChatOutputSchema,
} from '@/lib/schemas/ai-contracts';
import { applyWorkspacePatch } from '@/lib/engine/layout-graph';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';

describe('ai-contracts and graph patcher', () => {
  it('validates hydrated question structure against Zod contract', () => {
    const initial = createInitialDiscoveryState();
    const hydrated = hydrateQuestionsFromStoryFallback(
      'Platform belajar bahasa Inggris untuk mahasiswa persiapan kerja.',
      initial.questions
    );

    const parsed = HydrateQuestionsLlmOutputSchema.safeParse(hydrated);
    expect(parsed.success).toBe(true);
  });

  it('applies WorkspacePatch cleanly and strips orphan edges when removing a node', () => {
    const discovery = createInitialDiscoveryState();
    const hydrated = hydrateQuestionsFromStoryFallback(
      'Portofolio desainer grafis untuk menerima brief proyek dari klien.',
      discovery.questions
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

    const chatPayload = {
      assistantMessage: 'Ditambahkan node baru.',
      patch: {
        upsertNodes: [
          {
            id: 'flow-extra-1',
            title: 'Kirim Konfirmasi Email',
            subtitle: 'Kirim salinan brief otomatis ke klien',
            kind: 'flow-feature' as const,
            zone: 'business-flow' as const,
            linkedSectionId: 'sec-flow-extra-1',
            connectFromNodeId: 'flow-decision',
            edgeLabel: 'Kirim email',
            details: {
              purpose: 'Memberi bukti pengajuan brief kepada klien.',
              actor: 'Sistem',
              uiComponents: ['Email Confirmation Banner'],
              userStory: 'Sebagai klien, saya ingin salinan brief terkirim ke email saya.',
              acceptanceCriteria: ['Email terkirim dalam <= 10 detik setelah submit.'],
              edgeCases: ['Email masuk folder spam: tampilkan reminder cek spam di layar sukses.'],
            },
          },
        ],
        removeNodeIds: ['flow-feat-2'],
      },
    };

    const validatedChat = WorkspaceChatOutputSchema.safeParse(chatPayload);
    expect(validatedChat.success).toBe(true);

    const { nextState, summary } = applyWorkspacePatch(workspace, chatPayload.patch);
    expect(summary).toContain('+1 Node Canvas');
    expect(summary).toContain('-1 Node Canvas');
    expect(nextState.nodes.some((n) => n.id === 'flow-extra-1')).toBe(true);
    expect(nextState.nodes.some((n) => n.id === 'flow-feat-2')).toBe(false);
    expect(
      nextState.edges.some((e) => e.source === 'flow-feat-2' || e.target === 'flow-feat-2')
    ).toBe(false);
  });
});
