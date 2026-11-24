import { describe, expect, it } from 'vitest';
import { applyWorkspacePatch } from '@/lib/engine/layout-graph';
import {
  applyFallbackChatCommand,
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';
import type { PrdPurpose, WorkspaceState } from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import {
  validateDiscoveryReadiness,
  validateWorkspacePrd,
} from '@/lib/validation/prd-validator';

function buildCompleteWorkspaceForPurpose(
  purpose: PrdPurpose,
  story: string
): WorkspaceState {
  const discovery = createInitialDiscoveryState(purpose);
  const hydrated = hydrateQuestionsFromStoryFallback(story, discovery.questions, purpose);
  discovery.q1Messages = [
    { id: 'u1', role: 'user', content: story },
    { id: 'a1', role: 'assistant', content: hydrated.assistantReply },
  ];
  discovery.q1Summary = hydrated.q1Summary;
  discovery.questions = hydrated.questions;
  discovery.questions.q2.selectedTagIds = [discovery.questions.q2.tags[0].id];
  discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
  discovery.questions.q4.selectedTagIds = [discovery.questions.q4.tags[0].id];
  discovery.questions.q5.selectedTagIds = [discovery.questions.q5.tags[0].id];

  return buildWorkspaceStateFromOutput(
    discovery,
    buildWorkspaceFallback(discovery),
    'smart-fallback'
  );
}

function applyChatFix(workspace: WorkspaceState, prompt: string): WorkspaceState {
  const { patch } = applyFallbackChatCommand(prompt, workspace);
  return applyWorkspacePatch(workspace, patch).nextState;
}

describe('purpose-based PRD validator', () => {
  it('validates UI/UX Process PRDs and reaches 100/100 after applying recommended fixes', () => {
    const initialWs = buildCompleteWorkspaceForPurpose(
      'ui-ux-process',
      'Desainer UI/UX yang merancang ulang alur checkout aplikasi belanja lokal agar langkah bayar lebih ringkas.'
    );

    const initialResult = validateWorkspacePrd(initialWs);
    expect(initialResult.prdPurpose).toBe('ui-ux-process');
    expect(initialResult.purposeLabel).toBe('UI / UX Proses');
    expect(initialResult.checks.some((c) => c.id === 'uxp-usability-testing' && c.status === 'pass')).toBe(true);
    expect(initialResult.checks.some((c) => c.id === 'uxp-ui-states-coverage' && c.status === 'pass')).toBe(true);
    expect(initialResult.score).toBeGreaterThanOrEqual(80);

    let upgraded = initialWs;
    for (const check of initialResult.checks) {
      if (check.status !== 'pass' && check.aiFixPrompt) {
        upgraded = applyChatFix(upgraded, check.aiFixPrompt);
      }
    }

    const finalResult = validateWorkspacePrd(upgraded);
    expect(finalResult.status).toBe('ready');
    expect(finalResult.score).toBe(100);
    expect(finalResult.summary.failed).toBe(0);
    expect(finalResult.summary.warnings).toBe(0);
  });

  it('validates Website PRDs (landing CTA, funnel, SEO/responsive/LCP) and supports automated spec fixes', () => {
    const initialWs = buildCompleteWorkspaceForPurpose(
      'website',
      'Studio foto butuh website booking agar calon klien bisa cek jadwal kosong dan bayar DP.'
    );

    const initialResult = validateWorkspacePrd(initialWs);
    expect(initialResult.prdPurpose).toBe('website');
    expect(initialResult.purposeLabel).toBe('Website');
    expect(initialResult.checks.some((c) => c.id === 'web-entry-value-prop' && c.status === 'pass')).toBe(true);
    expect(initialResult.checks.some((c) => c.id === 'web-conversion-funnel' && c.status === 'pass')).toBe(true);
    expect(
      initialResult.checks.some(
        (c) => c.id === 'web-responsive-seo-performance' && c.status !== 'pass'
      )
    ).toBe(true);

    let upgraded = initialWs;
    for (const check of initialResult.checks) {
      if (check.status !== 'pass' && check.aiFixPrompt) {
        upgraded = applyChatFix(upgraded, check.aiFixPrompt);
      }
    }

    const finalResult = validateWorkspacePrd(upgraded);
    expect(finalResult.status).toBe('ready');
    expect(finalResult.score).toBe(100);
    expect(upgraded.planSections.some((s) => s.category === 'specs')).toBe(true);
  });

  it('validates Application PRDs (onboarding, system states/offline, API & security specs)', () => {
    const initialWs = buildCompleteWorkspaceForPurpose(
      'application',
      'Pemilik kedai kopi butuh aplikasi kasir dan stok harian di tablet agar penjualan otomatis sinkron.'
    );

    const initialResult = validateWorkspacePrd(initialWs);
    expect(initialResult.prdPurpose).toBe('application');
    expect(initialResult.purposeLabel).toBe('Aplikasi');
    expect(
      initialResult.checks.some((c) => c.id === 'app-onboarding-auth-entry' && c.status === 'pass')
    ).toBe(true);
    expect(
      initialResult.checks.some((c) => c.id === 'app-system-states-offline' && c.status === 'pass')
    ).toBe(true);
    expect(
      initialResult.checks.some(
        (c) => c.id === 'app-integration-security-nfr' && c.status !== 'pass'
      )
    ).toBe(true);

    let upgraded = initialWs;
    for (const check of initialResult.checks) {
      if (check.status !== 'pass' && check.aiFixPrompt) {
        upgraded = applyChatFix(upgraded, check.aiFixPrompt);
      }
    }

    const finalResult = validateWorkspacePrd(upgraded);
    expect(finalResult.status).toBe('ready');
    expect(finalResult.score).toBe(100);
  });

  it('detects critical structural issues (dangling edges, missing AC, missing summary) and supports cross-purpose evaluation', () => {
    const ws = buildCompleteWorkspaceForPurpose(
      'website',
      'Website portofolio desainer untuk menerima brief proyek klien.'
    );

    // Evaluate a Website workspace against UI/UX Process rubric without mutating
    const crossCheck = validateWorkspacePrd(ws, 'ui-ux-process');
    expect(crossCheck.prdPurpose).toBe('ui-ux-process');
    expect(crossCheck.checks.some((c) => c.id === 'uxp-user-flow-wireframe')).toBe(true);

    // Corrupt workspace to verify critical structural validation catches defects
    const broken: WorkspaceState = {
      ...ws,
      discovery: {
        ...ws.discovery,
        q1Summary: null,
      },
      planSections: [],
      edges: [
        ...ws.edges,
        { id: 'bad-edge', source: 'missing-node-a', target: 'missing-node-b' },
      ],
      nodes: ws.nodes.map((node, index) =>
        index === 4
          ? {
              ...node,
              data: {
                ...node.data,
                details: {
                  ...node.data.details,
                  acceptanceCriteria: [],
                  edgeCases: [],
                },
              },
            }
          : node
      ),
    };

    const brokenResult = validateWorkspacePrd(broken);
    expect(brokenResult.status).toBe('incomplete');
    expect(brokenResult.summary.failed).toBeGreaterThanOrEqual(3);
    expect(
      brokenResult.checks.find((c) => c.id === 'core-flow-integrity')?.status
    ).toBe('fail');
    expect(
      brokenResult.checks.find((c) => c.id === 'core-testable-criteria')?.status
    ).toBe('fail');
  });

  it('validates Discovery Q1-Q5 readiness tailored to ui-ux-process, website, and application', () => {
    const initial = createInitialDiscoveryState('ui-ux-process');
    const emptyCheck = validateDiscoveryReadiness(initial);
    expect(emptyCheck.readyToGenerate).toBe(false);
    expect(emptyCheck.purposeLabel).toBe('UI / UX Proses');
    expect(emptyCheck.score).toBe(0);

    const hydrated = hydrateQuestionsFromStoryFallback(
      'Tim produk menyusun ulang onboarding fintech agar verifikasi KTP lancar.',
      initial.questions,
      'ui-ux-process'
    );
    initial.q1Summary = hydrated.q1Summary;
    initial.questions = hydrated.questions;
    initial.questions.q2.selectedTagIds = [initial.questions.q2.tags[0].id];
    initial.questions.q3.selectedTagIds = [initial.questions.q3.tags[0].id]; // only 1 selected
    initial.questions.q4.selectedTagIds = [initial.questions.q4.tags[0].id];
    initial.questions.q5.selectedTagIds = [initial.questions.q5.tags[0].id];

    const partialQ3Check = validateDiscoveryReadiness(initial);
    expect(partialQ3Check.readyToGenerate).toBe(true);
    expect(partialQ3Check.checks.find((c) => c.id === 'disc-q3')?.passed).toBe(false);

    initial.questions.q3.selectedTagIds = initial.questions.q3.tags.slice(0, 3).map((t) => t.id);
    const fullCheck = validateDiscoveryReadiness(initial);
    expect(fullCheck.readyToGenerate).toBe(true);
    expect(fullCheck.score).toBe(100);
    expect(fullCheck.businessScore).toBe(0);

    initial.businessContext = { ...PRD_PURPOSE_MAP['ui-ux-process'].businessPresets.defaultPreset };
    const fullBizCheck = validateDiscoveryReadiness(initial);
    expect(fullBizCheck.businessScore).toBe(100);
  });

  it('integrates purpose businessContext presets into Workspace specs, KPIs, and achieves purpose validation pass', () => {
    for (const purpose of ['ui-ux-process', 'website', 'application'] as const) {
      const discovery = createInitialDiscoveryState(purpose);
      const story =
        purpose === 'ui-ux-process'
          ? 'Desainer UI/UX merapikan alur checkout aplikasi belanja lokal.'
          : purpose === 'application'
          ? 'Pemilik kedai kopi butuh aplikasi kasir dan stok harian.'
          : 'Studio foto butuh website booking agar klien bisa cek jadwal dan bayar DP.';
      const hydrated = hydrateQuestionsFromStoryFallback(story, discovery.questions, purpose);
      discovery.q1Summary = hydrated.q1Summary;
      discovery.questions = hydrated.questions;
      discovery.questions.q2.selectedTagIds = [discovery.questions.q2.tags[0].id];
      discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
      discovery.questions.q4.selectedTagIds = [discovery.questions.q4.tags[0].id];
      discovery.questions.q5.selectedTagIds = [discovery.questions.q5.tags[0].id];
      discovery.businessContext = { ...PRD_PURPOSE_MAP[purpose].businessPresets.defaultPreset };

      const ws = buildWorkspaceStateFromOutput(
        discovery,
        buildWorkspaceFallback(discovery),
        'smart-fallback'
      );

      expect(ws.planSections.some((s) => s.category === 'specs')).toBe(true);
      const validation = validateWorkspacePrd(ws);
      expect(validation.status).toBe('ready');
      expect(validation.score).toBeGreaterThanOrEqual(90);
    }
  });
});
