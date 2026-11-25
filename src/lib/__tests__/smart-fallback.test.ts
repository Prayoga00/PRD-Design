import { describe, expect, it } from 'vitest';
import { relayoutWorkspaceNodes } from '@/lib/engine/layout-graph';
import {
  applyFallbackChatCommand,
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';

describe('smart-fallback engine', () => {
  it('hydrates domain-specific tags, extracts Q1 context, and enables unlimited selection across Q2-Q5', () => {
    const initial = createInitialDiscoveryState();
    const bookingResult = hydrateQuestionsFromStoryFallback(
      'Saya seorang dokter gigi yang ingin pasien bisa booking jadwal klinik tanpa antre lama.',
      initial.questions
    );

    expect(bookingResult.q1Summary.archetype).toBe('booking');
    expect(bookingResult.q1Summary.productNameSuggestion).toBe('Sistem Reservasi & Booking Jasa');
    expect(bookingResult.q1Summary.persona.toLowerCase()).toContain('dokter gigi');
    expect(bookingResult.q1Summary.coreGoal.toLowerCase()).toContain('booking jadwal klinik');

    const studioResult = hydrateQuestionsFromStoryFallback(
      'Fotografer wedding yang ingin bikin web booking agar calon klien bisa cek tanggal kosong dan bayar DP.',
      initial.questions
    );
    expect(studioResult.q1Summary.productNameSuggestion).toBe('Web booking');
    expect(studioResult.q1Summary.painPoint.length).toBeGreaterThan(8);
    expect(studioResult.questions.q3.tags.some((t) => /pembayaran|qr|dp/i.test(t.label))).toBe(true);

    for (const qId of ['q2', 'q3', 'q4', 'q5'] as const) {
      expect(bookingResult.questions[qId].selectionMode).toBe('unlimited');
      expect(bookingResult.questions[qId].maxSelect).toBeNull();
    }

    expect(bookingResult.questions.q4.prompt.toLowerCase()).not.toContain('toko online');
    expect(bookingResult.questions.q5.prompt.toLowerCase()).not.toContain('toko online');
    expect(bookingResult.questions.q3.tags.some((t) => /kalender|slot/i.test(t.label))).toBe(true);
  });

  it('preserves all user-added custom tags and unlimited selections when Q1 is updated again', () => {
    const initial = createInitialDiscoveryState();
    initial.questions.q3.tags.push({
      id: 'user-custom-1',
      label: 'Integrasi WhatsApp Gateway',
      source: 'user',
    });
    initial.questions.q3.selectedTagIds = [
      initial.questions.q3.tags[0].id,
      initial.questions.q3.tags[1].id,
      initial.questions.q3.tags[2].id,
      'user-custom-1',
    ];

    const saasResult = hydrateQuestionsFromStoryFallback(
      'Aplikasi SaaS tracker progres tugas tim desain agar revisi tidak tercecer.',
      initial.questions
    );

    expect(saasResult.q1Summary.archetype).toBe('saas');
    expect(saasResult.q1Summary.painPoint.toLowerCase()).toContain('revisi tidak tercecer');
    expect(saasResult.questions.q3.tags.some((t) => t.id === 'user-custom-1')).toBe(true);
    expect(saasResult.questions.q3.selectedTagIds).toContain('user-custom-1');
    expect(saasResult.questions.q3.selectedTagIds.length).toBeGreaterThanOrEqual(1);
  });

  it('builds a synchronized workspace supporting unlimited multi-select in Q2 and 4+ features in Q3 without overlaps', () => {
    const discovery = createInitialDiscoveryState();
    const hydrated = hydrateQuestionsFromStoryFallback(
      'Ibu rumah tangga jualan kue kering pre-order agar pembeli mudah memilih varian dan bayar QRIS tanpa ribet chat WhatsApp.',
      discovery.questions
    );
    discovery.q1Summary = hydrated.q1Summary;
    discovery.questions = hydrated.questions;
    // Select ALL tags in Q2 and 5 features in Q3 to verify unlimited selection flow
    discovery.questions.q2.selectedTagIds = discovery.questions.q2.tags.slice(0, 3).map((t) => t.id);
    discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 5).map((t) => t.id);
    discovery.questions.q4.selectedTagIds = discovery.questions.q4.tags.map((t) => t.id);
    discovery.questions.q5.selectedTagIds = discovery.questions.q5.tags.map((t) => t.id);

    const output = buildWorkspaceFallback(discovery);
    const workspace = buildWorkspaceStateFromOutput(discovery, output, 'smart-fallback');

    const uxNodes = workspace.nodes.filter((n) => n.data.zone === 'ux-research');
    const flowNodes = workspace.nodes.filter((n) => n.data.zone === 'business-flow');

    expect(uxNodes.length).toBe(4);
    expect(flowNodes.length).toBe(9); // 1 entry + 5 features + 1 decision + 1 recovery + 1 outcome

    // Ensure full Flowchart topology: decision Ya & Tidak branches + recovery loopback + 4 connected UX inputs
    expect(workspace.edges.some((e) => e.source === 'flow-decision' && e.target === 'flow-outcome')).toBe(true);
    expect(workspace.edges.some((e) => e.source === 'flow-decision' && e.target === 'flow-recovery')).toBe(true);
    expect(workspace.edges.some((e) => e.source === 'flow-recovery' && e.target === 'flow-feat-1')).toBe(true);
    for (const uxNode of uxNodes) {
      expect(workspace.edges.some((e) => e.source === uxNode.id)).toBe(true);
    }

    const entryNode = flowNodes.find((n) => n.id === 'flow-entry');
    expect(entryNode?.data.details.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);

    // Ensure no two nodes occupy overlapping positions in TB (default) AND LR orientations
    for (const dir of ['TB', 'LR'] as const) {
      const checkedNodes = dir === 'TB' ? workspace.nodes : relayoutWorkspaceNodes(workspace.nodes, workspace.edges, 'LR');
      for (let i = 0; i < checkedNodes.length; i++) {
        for (let j = i + 1; j < checkedNodes.length; j++) {
          const a = checkedNodes[i].position;
          const b = checkedNodes[j].position;
          const overlaps = Math.abs(a.x - b.x) < 200 && Math.abs(a.y - b.y) < 100;
          expect(overlaps).toBe(false);
        }
      }
    }

    // Ensure every business flow node has a linked Plan Text section
    for (const node of flowNodes) {
      expect(workspace.planSections.some((s) => s.linkedNodeId === node.id)).toBe(true);
    }

    // Ensure chat command produces actionable patch
    const chatRes = applyFallbackChatCommand('Tambah alur retur dan pengembalian dana', workspace);
    expect(chatRes.patch.upsertNodes?.length).toBe(1);
    expect(chatRes.patch.upsertPlanSections?.length).toBe(1);
  });

  it('adapts questions, context signals, and Figma artifacts when prdPurpose is ui-ux-process or application', () => {
    const uxDiscovery = createInitialDiscoveryState('ui-ux-process');
    const uxHydrated = hydrateQuestionsFromStoryFallback(
      'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja agar lebih ringkas dan bayar QRIS lancar.',
      uxDiscovery.questions,
      'ui-ux-process'
    );

    expect(uxHydrated.q1Summary.prdPurpose).toBe('ui-ux-process');
    expect(uxHydrated.questions.q2.title).toContain('Riset / UX');
    expect(uxHydrated.questions.q3.tags.some((t) => /Wireframe|Prototype|User Flow/i.test(t.label))).toBe(true);
    expect(uxHydrated.questions.q3.tags.some((t) => /Checkout|Bayar/i.test(t.label))).toBe(true);

    uxDiscovery.q1Summary = uxHydrated.q1Summary;
    uxDiscovery.questions = uxHydrated.questions;
    uxDiscovery.questions.q2.selectedTagIds = [uxDiscovery.questions.q2.tags[0].id];
    uxDiscovery.questions.q3.selectedTagIds = uxDiscovery.questions.q3.tags.slice(0, 4).map((t) => t.id);
    uxDiscovery.questions.q4.selectedTagIds = [uxDiscovery.questions.q4.tags[0].id];
    uxDiscovery.questions.q5.selectedTagIds = [uxDiscovery.questions.q5.tags[0].id];

    const uxWorkspace = buildWorkspaceStateFromOutput(
      uxDiscovery,
      buildWorkspaceFallback(uxDiscovery),
      'smart-fallback'
    );
    expect(uxWorkspace.nodes.some((n) => n.data.title.includes('Usability Test'))).toBe(true);
    expect(uxWorkspace.nodes.some((n) => n.data.title.includes('Handoff Dev'))).toBe(true);

    const appDiscovery = createInitialDiscoveryState('application');
    const appHydrated = hydrateQuestionsFromStoryFallback(
      'Pemilik kedai kopi butuh aplikasi kasir & stok harian di tablet.',
      appDiscovery.questions,
      'application'
    );
    expect(appHydrated.q1Summary.prdPurpose).toBe('application');
    expect(appHydrated.questions.q2.title).toContain('Onboarding Pertama Aplikasi');
    expect(appHydrated.questions.q2.tags.some((t) => /Guest Mode|1-Tap/i.test(t.label))).toBe(true);
  });
});
