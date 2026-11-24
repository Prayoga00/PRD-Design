import { describe, expect, it } from 'vitest';
import {
  buildMermaidFlowchart,
  compilePrdMarkdown,
  escapeMermaidLabel,
  slugifyFilename,
} from '@/lib/export/markdown-exporter';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  createInitialDiscoveryState,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';

describe('markdown-exporter', () => {
  it('escapes quotes, brackets, pipes, and newlines safely for Mermaid nodes', () => {
    const escaped = escapeMermaidLabel('Cek "Stok" [Varian A|B]\n<script>');
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain('[');
    expect(escaped).not.toContain(']');
    expect(escaped).not.toContain('|');
    expect(escaped).not.toContain('\n');
    expect(escaped).not.toContain('<');
  });

  it('compiles a Strict PRD Markdown document containing embedded Mermaid diagram', () => {
    const discovery = createInitialDiscoveryState();
    const hydrated = hydrateQuestionsFromStoryFallback(
      'Toko online kue kering rumahan untuk pesanan hari raya.',
      discovery.questions
    );
    discovery.q1Summary = hydrated.q1Summary;
    discovery.questions = hydrated.questions;
    discovery.questions.q2.selectedTagIds = [discovery.questions.q2.tags[0].id];
    discovery.questions.q3.selectedTagIds = discovery.questions.q3.tags.slice(0, 3).map((t) => t.id);
    discovery.questions.q4.selectedTagIds = [discovery.questions.q4.tags[0].id];
    discovery.questions.q5.selectedTagIds = [discovery.questions.q5.tags[0].id];

    const workspace = buildWorkspaceStateFromOutput(
      discovery,
      buildWorkspaceFallback(discovery),
      'smart-fallback'
    );

    const md = compilePrdMarkdown(workspace);
    const mermaid = buildMermaidFlowchart(workspace.nodes, workspace.edges);

    expect(md).toContain('## 1. Executive Summary');
    expect(md).toContain('Tujuan Pembuatan PRD:** Website');
    expect(md).toContain('## 2. User Experience & UX Research');
    expect(md).toContain('## 3. Struktur Flow Kerja Bisnis (Canvas Diagram)');
    expect(md).toContain('```mermaid');
    expect(md).toContain('## 4. Detail Perencanaan & Spesifikasi per Tahap');
    expect(md).toContain('## 5. Non-Goals, Risks & Next Steps');
    expect(mermaid).toContain('flowchart LR');
    expect(mermaid).toContain('subgraph UX_Research');
    expect(mermaid).toContain('subgraph Business_Flow');
    expect(slugifyFilename('Toko Kue Ibu Sari!')).toBe('prdin-toko-kue-ibu-sari.md');
  });
});
