import type { PrdinEdge, PrdinNode, WorkspaceState } from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import { ROADMAP_COLUMNS } from '@/lib/engine/roadmap-defaults';
import { validateWorkspacePrd } from '@/lib/validation/prd-validator';

export function slugifyFilename(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return `prdin-${cleaned || 'product-prd'}.md`;
}

export function sanitizeMermaidId(rawId: string): string {
  const normalized = rawId.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z]/.test(normalized) ? normalized : `n_${normalized}`;
}

export function escapeMermaidLabel(label: string): string {
  return label
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/[<>]/g, '')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\|/g, '/')
    .trim();
}

export function buildMermaidFlowchart(nodes: PrdinNode[], edges: PrdinEdge[]): string {
  const uxNodes = nodes.filter((n) => n.data.zone === 'ux-research');
  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');

  const lines: string[] = ['flowchart LR'];

  if (uxNodes.length > 0) {
    lines.push('  subgraph UX_Research["UX Research & Insight"]');
    for (const node of uxNodes) {
      const mId = sanitizeMermaidId(node.id);
      const label = escapeMermaidLabel(`${node.data.title}: ${node.data.subtitle}`);
      lines.push(`    ${mId}["${label}"]`);
    }
    lines.push('  end');
  }

  if (flowNodes.length > 0) {
    lines.push('  subgraph Business_Flow["Struktur Flow Kerja Bisnis"]');
    for (const node of flowNodes) {
      const mId = sanitizeMermaidId(node.id);
      const label = escapeMermaidLabel(`${node.data.title} - ${node.data.subtitle}`);
      if (node.data.kind === 'flow-decision') {
        lines.push(`    ${mId}{"${label}"}`);
      } else {
        lines.push(`    ${mId}["${label}"]`);
      }
    }
    lines.push('  end');
  }

  const nodeIdSet = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) continue;
    const fromId = sanitizeMermaidId(edge.source);
    const toId = sanitizeMermaidId(edge.target);
    if (edge.label && edge.label.trim().length > 0) {
      const safeEdgeLabel = escapeMermaidLabel(edge.label);
      lines.push(`  ${fromId} -->|"${safeEdgeLabel}"| ${toId}`);
    } else {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join('\n');
}

function findSelectedLabels(
  workspace: WorkspaceState,
  qId: 'q2' | 'q3' | 'q4' | 'q5'
): string[] {
  const q = workspace.discovery.questions[qId];
  const tagMap = new Map(q.tags.map((t) => [t.id, t.label]));
  return q.selectedTagIds.map((id) => tagMap.get(id) ?? id);
}

/**
 * Compiles the full PRDin workspace into a Strict-PRD-compliant Markdown document
 * with an embedded Mermaid diagram derived directly from the Center Canvas.
 */
export function compilePrdMarkdown(workspace: WorkspaceState): string {
  const { discovery, nodes, edges, planSections, projectTitle } = workspace;
  const prdPurpose = discovery.prdPurpose ?? 'website';
  const purposeLabel = PRD_PURPOSE_MAP[prdPurpose].label;
  const q1 = discovery.q1Summary;
  const q2Labels = findSelectedLabels(workspace, 'q2');
  const q3Labels = findSelectedLabels(workspace, 'q3');
  const q4Labels = findSelectedLabels(workspace, 'q4');
  const q5Labels = findSelectedLabels(workspace, 'q5');

  const summarySections = planSections.filter((s) => s.category === 'summary');
  const uxSections = planSections.filter((s) => s.category === 'ux-research');
  const specSections = planSections.filter((s) => s.category === 'specs');
  const nonGoalSections = planSections.filter((s) => s.category === 'non-goals');

  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');
  const mermaidBlock = buildMermaidFlowchart(nodes, edges);
  const biz = discovery.businessContext;
  const customKpis = biz?.successMetrics
    ?.split(/[;\n]+/)
    .map((item) => item.trim().replace(/^[-*]\s*/, ''))
    .filter(Boolean);

  const lines: string[] = [
    `# PRD: ${projectTitle}`,
    '',
    `> **Tujuan Pembuatan PRD:** ${purposeLabel} · Dihasilkan dengan **PRDin** — AI Visual PRD & Business Flow Studio.`,
    '',
    '---',
    '',
    '## 1. Executive Summary',
    '',
    `- **Problem Statement:** ${q1?.painPoint ?? 'Pengguna membutuhkan alur digital yang lebih terstruktur untuk mencapai tujuannya.'}`,
    `- **Proposed Solution:** ${q1?.coreGoal ?? projectTitle} yang berfokus pada ${q3Labels.join(', ') || 'fitur inti produk'}.`,
    `- **Success Criteria:**`,
    ...(customKpis && customKpis.length > 0
      ? customKpis.map((kpi) => `  - ${kpi}`)
      : [
          `  - Pengguna baru menyelesaikan langkah awal (${q2Labels[0] ?? 'onboarding'}) dalam <= 3 menit.`,
          `  - Tingkat adopsi pemicu nilai utama (${q4Labels.join(', ') || 'core value'}) mencapai >= 60% pada pengguna aktif mingguan.`,
          `  - Tingkat retensi kembali melalui mekanisme (${q5Labels.join(', ') || 'retention loop'}) mencapai >= 35% dalam 30 hari.`,
        ]),
  ];

  for (const sec of summarySections) {
    lines.push('', `### ${sec.title}`, '', sec.content);
  }

  lines.push(
    '',
    '---',
    '',
    '## 2. User Experience & UX Research',
    '',
    `- **Target Persona (Q1):** ${q1?.persona ?? 'Target pengguna utama'}`,
    `- **Kebutuhan & Masalah Utama:** ${q1?.painPoint ?? '-'}`,
    `- **Aksi Awal (Q2):** ${q2Labels.join(', ') || '-'}`,
    `- **Fitur & Kebutuhan Prioritas (Q3):** ${q3Labels.join(', ') || '-'}`,
    `- **Alasan Pengguna Mau Memakai (Q4 - Adoption Hook):** ${q4Labels.join(', ') || '-'}`,
    `- **Alasan Pengguna Kembali Lagi (Q5 - Retention Loop):** ${q5Labels.join(', ') || '-'}`
  );

  if (biz?.userRolesAndRules?.trim()) {
    lines.push(`- **Peran Aktor & Aturan Bisnis:** ${biz.userRolesAndRules.trim()}`);
  }

  for (const sec of uxSections) {
    lines.push('', `### ${sec.title}`, '', sec.content);
  }

  lines.push(
    '',
    '---',
    '',
    '## 3. Struktur Flow Kerja Bisnis (Canvas Diagram)',
    '',
    '```mermaid',
    mermaidBlock,
    '```',
    '',
    '---',
    '',
    '## 4. Detail Perencanaan & Spesifikasi per Tahap',
    ''
  );

  if (flowNodes.length === 0) {
    lines.push('_Belum ada node alur kerja bisnis pada canvas._', '');
  } else {
    flowNodes.forEach((node, index) => {
      const { details } = node.data;
      lines.push(
        `### 4.${index + 1}. ${node.data.title}`,
        '',
        `- **Ringkasan:** ${node.data.subtitle}`,
        `- **Tujuan Tahap:** ${details.purpose}`,
        `- **Aktor:** ${details.actor}`,
        `- **Komponen UI (Panduan UI/UX Designer):** ${details.uiComponents.join(', ')}`,
        `- **User Story:** ${details.userStory}`,
        '- **Acceptance Criteria:**',
        ...details.acceptanceCriteria.map((ac) => `  - [ ] ${ac}`),
        '- **Edge Cases & Penanganan Kendala:**',
        ...details.edgeCases.map((ec) => `  - ${ec}`),
        ''
      );
    });
  }

  if (specSections.length > 0) {
    lines.push('### Catatan Spesifikasi Tambahan', '');
    for (const sec of specSections) {
      lines.push(`#### ${sec.title}`, '', sec.content, '');
    }
  } else if (biz?.technicalConstraints?.trim()) {
    lines.push(
      '### Catatan Spesifikasi & Batasan Teknis',
      '',
      biz.technicalConstraints.trim(),
      ''
    );
  }

  lines.push('---', '', '## 5. Non-Goals, Risks & Next Steps', '');

  if (nonGoalSections.length > 0) {
    for (const sec of nonGoalSections) {
      lines.push(`### ${sec.title}`, '', sec.content, '');
    }
  } else {
    lines.push(
      `- **Non-Goals MVP:** ${biz?.nonGoals?.trim() || 'Fitur sekunder di luar prioritas wajib awal ditunda ke rilis berikutnya agar fokus pada validasi alur utama.'}`,
      '- **Technical Risks:** Validasi performa antarmuka pada perangkat mobile dan kejelasan error state saat pengguna awam melakukan kesalahan input.',
      ''
    );
  }

  const tasks = workspace.roadmapTasks ?? [];
  lines.push('---', '', '## 6. Roadmap & Status Task', '');
  if (tasks.length === 0) {
    lines.push('_Belum ada task pada roadmap._', '');
  } else {
    for (const col of ROADMAP_COLUMNS) {
      const colTasks = tasks.filter((t) => t.status === col.id);
      lines.push(`### ${col.label} (${colTasks.length})`, '');
      if (colTasks.length === 0) {
        lines.push('- _Tidak ada task._', '');
      } else {
        for (const task of colTasks) {
          const checkMark = col.id === 'done' ? 'x' : ' ';
          const reasonSuffix =
            col.id === 'failed' && task.failureReason
              ? ` _(Alasan gagal: ${task.failureReason})_`
              : '';
          lines.push(`- [${checkMark}] **${task.title}**${reasonSuffix}`);
        }
        lines.push('');
      }
    }
  }

  const validation = validateWorkspacePrd(workspace);
  lines.push(
    '---',
    '',
    `## 7. Hasil Validasi PRD (${purposeLabel})`,
    '',
    `- **Skor Kelayakan PRD:** ${validation.score}/100 (**${validation.statusLabel}**)`,
    `- **Ringkasan Pemeriksaan:** ${validation.summary.passed} lolos · ${validation.summary.warnings} saran · ${validation.summary.failed} perlu perbaikan`,
    '',
    '| Status | Kategori | Kriteria Validasi | Catatan |',
    '| :--- | :--- | :--- | :--- |'
  );

  for (const check of validation.checks) {
    const statusTag =
      check.status === 'pass' ? '[PASS]' : check.status === 'warning' ? '[WARN]' : '[FAIL]';
    const safeCat = escapeMermaidLabel(check.categoryLabel);
    const safeTitle = escapeMermaidLabel(check.title);
    const safeMsg = escapeMermaidLabel(check.message);
    lines.push(`| \`${statusTag}\` | ${safeCat} | ${safeTitle} | ${safeMsg} |`);
  }

  if (validation.recommendations.length > 0) {
    lines.push('', '### Rekomendasi Penyempurnaan', '');
    for (const rec of validation.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}
