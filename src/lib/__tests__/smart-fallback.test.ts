import { describe, expect, it } from 'vitest';
import {
  applyFallbackChatCommand,
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';

describe('smart-fallback engine', () => {
  it('hydrates domain-specific tags and adaptive Q4/Q5 prompts for non-ecommerce stories', () => {
    const initial = createInitialDiscoveryState();
    const bookingResult = hydrateQuestionsFromStoryFallback(
      'Saya seorang dokter gigi yang ingin pasien bisa booking jadwal klinik tanpa antre lama.',
      initial.questions
    );

    expect(bookingResult.q1Summary.archetype).toBe('booking');
    expect(bookingResult.q1Summary.productNameSuggestion).toBe('Sistem Reservasi & Booking Jasa');
    const studioResult = hydrateQuestionsFromStoryFallback(
      'Fotografer wedding yang ingin bikin web booking agar calon klien bisa cek tanggal kosong.',
      initial.questions
    );
    expect(studioResult.q1Summary.productNameSuggestion).toBe('Web booking');
    expect(bookingResult.questions.q3.maxSelect).toBe(3);
    expect(bookingResult.questions.q4.prompt.toLowerCase()).not.toContain('toko online');
    expect(bookingResult.questions.q5.prompt.toLowerCase()).not.toContain('toko online');
    expect(bookingResult.questions.q3.tags.some((t) => /kalender|slot/i.test(t.label))).toBe(true);
  });

  it('preserves user-added custom tags when Q1 is updated again', () => {
    const initial = createInitialDiscoveryState();
    initial.questions.q3.tags.push({
      id: 'user-custom-1',
      label: 'Integrasi WhatsApp Gateway',
      source: 'user',
    });
    initial.questions.q3.selectedTagIds = ['user-custom-1'];

    const saasResult = hydrateQuestionsFromStoryFallback(
      'Aplikasi SaaS tracker progres tugas tim desain agar revisi tidak tercecer.',
      initial.questions
    );

    expect(saasResult.q1Summary.archetype).toBe('saas');
    expect(saasResult.questions.q3.tags.some((t) => t.id === 'user-custom-1')).toBe(true);
    expect(saasResult.questions.q3.selectedTagIds).toContain('user-custom-1');
  });

  it('builds a synchronized workspace with UX Research and Business Flow nodes without overlaps', () => {
    const discovery = createInitialDiscoveryState();
    const hydrated = hydrateQuestionsFromStoryFallback(
      'Ibu rumah tangga jualan kue kering pre-order agar pembeli mudah memilih varian dan bayar QRIS.',
      discovery.questions
    );
    discovery.q1Summary = hydrated.q1Summary;
    discovery.questions = hydrated.questions;
    discovery.questions.q2.selectedTagIds = [discovery.questions.q2.tags[0].id];
    discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
    discovery.questions.q4.selectedTagIds = [discovery.questions.q4.tags[0].id];
    discovery.questions.q5.selectedTagIds = [discovery.questions.q5.tags[0].id];

    const output = buildWorkspaceFallback(discovery);
    const workspace = buildWorkspaceStateFromOutput(discovery, output, 'smart-fallback');

    const uxNodes = workspace.nodes.filter((n) => n.data.zone === 'ux-research');
    const flowNodes = workspace.nodes.filter((n) => n.data.zone === 'business-flow');

    expect(uxNodes.length).toBe(4);
    expect(flowNodes.length).toBeGreaterThanOrEqual(5);

    // Ensure no two nodes occupy identical overlapping positions
    for (let i = 0; i < workspace.nodes.length; i++) {
      for (let j = i + 1; j < workspace.nodes.length; j++) {
        const a = workspace.nodes[i].position;
        const b = workspace.nodes[j].position;
        const overlaps = Math.abs(a.x - b.x) < 200 && Math.abs(a.y - b.y) < 100;
        expect(overlaps).toBe(false);
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

  it('adapts questions, nodes, and Figma artifacts when prdPurpose is ui-ux-process or application', () => {
    const uxDiscovery = createInitialDiscoveryState('ui-ux-process');
    const uxHydrated = hydrateQuestionsFromStoryFallback(
      'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja agar lebih ringkas.',
      uxDiscovery.questions,
      'ui-ux-process'
    );

    expect(uxHydrated.q1Summary.prdPurpose).toBe('ui-ux-process');
    expect(uxHydrated.questions.q2.title).toContain('Riset / UX');
    expect(uxHydrated.questions.q3.tags.some((t) => /Wireframe|Prototype|User Flow/i.test(t.label))).toBe(true);

    uxDiscovery.q1Summary = uxHydrated.q1Summary;
    uxDiscovery.questions = uxHydrated.questions;
    uxDiscovery.questions.q2.selectedTagIds = [uxDiscovery.questions.q2.tags[0].id];
    uxDiscovery.questions.q3.selectedTagIds = uxDiscovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
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
