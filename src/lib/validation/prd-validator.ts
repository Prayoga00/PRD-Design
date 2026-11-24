import type {
  DiscoveryState,
  PlanSection,
  PrdPurpose,
  PrdinEdge,
  PrdinNode,
  RoadmapTask,
  WorkspaceState,
} from '@/lib/types/prdin';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';

export type ValidationSeverity = 'error' | 'warning';
export type ValidationCheckStatus = 'pass' | 'warning' | 'fail';
export type ValidationCategory =
  | 'foundation'
  | 'ux-clarity'
  | 'flow-integrity'
  | 'purpose-specific'
  | 'quality-metrics'
  | 'scope-roadmap';

export interface PrdValidationCheck {
  id: string;
  category: ValidationCategory;
  categoryLabel: string;
  title: string;
  description: string;
  status: ValidationCheckStatus;
  severity: ValidationSeverity;
  weight: number;
  message: string;
  suggestion?: string;
  affectedNodeIds?: string[];
  aiFixPrompt?: string;
}

export interface PrdValidationSummary {
  passed: number;
  warnings: number;
  failed: number;
  total: number;
}

export interface PrdValidationResult {
  prdPurpose: PrdPurpose;
  purposeLabel: string;
  score: number;
  status: 'ready' | 'needs-improvement' | 'incomplete';
  statusLabel: string;
  summary: PrdValidationSummary;
  checks: PrdValidationCheck[];
  recommendations: string[];
}

export interface DiscoveryValidationCheck {
  id: string;
  title: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
}

export interface DiscoveryValidationResult {
  prdPurpose: PrdPurpose;
  purposeLabel: string;
  readyToGenerate: boolean;
  score: number;
  checks: DiscoveryValidationCheck[];
  businessScore: number;
  businessChecks: DiscoveryValidationCheck[];
}

const VAGUE_TERM_REGEX =
  /\b(cepat|mudah|intuitif|modern|bagus|simpel|sederhana|lancar|nyaman|ramah|optimal|efisien|user[- ]?friendly)\b/i;

const MEASURABLE_QUALIFIER_REGEX =
  /(\d+\s*(%|persen|ms|detik|s\b|menit|jam|hari|px|klik|langkah|step|karakter|item|mb|kb|skor|score|wcag|aa|aaa|http|kali))|((<=|>=|<|>|\bminimal\b|\bmaksimal\b|\bpaling lama\b|\bpaling sedikit\b)\s*\d+)/i;

function isCriterionVague(text: string): boolean {
  const cleaned = text.trim();
  if (!cleaned) return false;
  return VAGUE_TERM_REGEX.test(cleaned) && !MEASURABLE_QUALIFIER_REGEX.test(cleaned);
}

function collectNodeCorpus(nodes: PrdinNode[], planSections: PlanSection[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    parts.push(
      node.data.title,
      node.data.subtitle,
      node.data.details.purpose,
      node.data.details.actor,
      node.data.details.userStory,
      ...node.data.details.uiComponents,
      ...node.data.details.acceptanceCriteria,
      ...node.data.details.edgeCases
    );
  }
  for (const sec of planSections) {
    parts.push(sec.title, sec.content);
  }
  return parts.join('\n').toLowerCase();
}

function findLinkedSection(node: PrdinNode, planSections: PlanSection[]): PlanSection | undefined {
  return (
    planSections.find((s) => s.linkedNodeId === node.id) ??
    planSections.find((s) => s.id === node.data.linkedSectionId)
  );
}

function buildCoreChecks(workspace: WorkspaceState): PrdValidationCheck[] {
  const nodes = workspace.nodes ?? [];
  const edges = workspace.edges ?? [];
  const planSections = workspace.planSections ?? [];
  const roadmapTasks: RoadmapTask[] = workspace.roadmapTasks ?? [];
  const q1 = workspace.discovery?.q1Summary ?? null;

  const checks: PrdValidationCheck[] = [];

  // 1. Executive Summary & Problem Framing
  const summarySection = planSections.find((s) => s.category === 'summary');
  const hasQ1Context = Boolean(
    q1 &&
      q1.persona.trim().length >= 5 &&
      q1.painPoint.trim().length >= 5 &&
      q1.coreGoal.trim().length >= 5
  );
  const hasSummaryContent = Boolean(summarySection && summarySection.content.trim().length >= 25);

  if (hasQ1Context && hasSummaryContent) {
    checks.push({
      id: 'core-executive-summary',
      category: 'foundation',
      categoryLabel: 'Fondasi PRD',
      title: 'Executive Summary & Problem Framing',
      description: 'Masalah utama, target persona, solusi yang diusulkan, dan tujuan proyek terdefinisi jelas.',
      status: 'pass',
      severity: 'error',
      weight: 10,
      message: 'Ringkasan eksekutif dan konteks masalah Q1 sudah lengkap.',
    });
  } else if (hasQ1Context || hasSummaryContent) {
    checks.push({
      id: 'core-executive-summary',
      category: 'foundation',
      categoryLabel: 'Fondasi PRD',
      title: 'Executive Summary & Problem Framing',
      description: 'Masalah utama, target persona, solusi yang diusulkan, dan tujuan proyek terdefinisi jelas.',
      status: 'warning',
      severity: 'error',
      weight: 10,
      message: hasQ1Context
        ? 'Bagian Ringkasan pada Plan Text belum terisi lengkap (>= 25 karakter).'
        : 'Data persona, masalah, dan tujuan inti dari Q1 belum terisi utuh.',
      suggestion: 'Pastikan Problem Statement, Proposed Solution, dan KPI terukur tertulis di bagian Ringkasan.',
      aiFixPrompt:
        'Lengkapi Executive Summary dengan Problem Statement, Proposed Solution, dan target metrik terukur.',
    });
  } else {
    checks.push({
      id: 'core-executive-summary',
      category: 'foundation',
      categoryLabel: 'Fondasi PRD',
      title: 'Executive Summary & Problem Framing',
      description: 'Masalah utama, target persona, solusi yang diusulkan, dan tujuan proyek terdefinisi jelas.',
      status: 'fail',
      severity: 'error',
      weight: 10,
      message: 'Executive Summary dan konteks Q1 belum tersedia.',
      suggestion: 'Tambahkan ringkasan masalah utama, solusi produk, dan kriteria sukses.',
      aiFixPrompt:
        'Lengkapi Executive Summary dengan Problem Statement, Proposed Solution, dan target metrik terukur.',
    });
  }

  // 2. UX Research Pillars
  const uxNodes = nodes.filter((n) => n.data.zone === 'ux-research');
  const uxKinds = new Set(uxNodes.map((n) => n.data.kind));
  const requiredUxKinds = ['ux-persona', 'ux-pain', 'ux-value', 'ux-retention'] as const;
  const missingUxKinds = requiredUxKinds.filter((k) => !uxKinds.has(k));

  if (missingUxKinds.length === 0 && uxNodes.every((n) => n.data.subtitle.trim().length >= 4)) {
    checks.push({
      id: 'core-ux-research-pillars',
      category: 'ux-clarity',
      categoryLabel: 'UX Research',
      title: '4 Pilar Riset UX (Persona, Masalah, Value, Retensi)',
      description: 'Memastikan seluruh keputusan fitur dan desain berpijak pada kebutuhan pengguna nyata.',
      status: 'pass',
      severity: 'error',
      weight: 10,
      message: 'Seluruh 4 pilar UX Research sudah terpetakan pada board.',
    });
  } else if (uxNodes.length >= 2) {
    checks.push({
      id: 'core-ux-research-pillars',
      category: 'ux-clarity',
      categoryLabel: 'UX Research',
      title: '4 Pilar Riset UX (Persona, Masalah, Value, Retensi)',
      description: 'Memastikan seluruh keputusan fitur dan desain berpijak pada kebutuhan pengguna nyata.',
      status: 'warning',
      severity: 'error',
      weight: 10,
      message: `Masih ada pilar UX Research yang belum lengkap (${missingUxKinds.join(', ') || 'subtitle singkat'}).`,
      suggestion: 'Lengkapi kartu Persona, Pain Point, Value Proposition, dan Retention Loop di zona UX Research.',
      affectedNodeIds: uxNodes.filter((n) => n.data.subtitle.trim().length < 4).map((n) => n.id),
      aiFixPrompt: 'Perdalam UX Research & komponen UI Figma agar 4 pilar riset lengkap.',
    });
  } else {
    checks.push({
      id: 'core-ux-research-pillars',
      category: 'ux-clarity',
      categoryLabel: 'UX Research',
      title: '4 Pilar Riset UX (Persona, Masalah, Value, Retensi)',
      description: 'Memastikan seluruh keputusan fitur dan desain berpijak pada kebutuhan pengguna nyata.',
      status: 'fail',
      severity: 'error',
      weight: 10,
      message: 'Board UX Research masih kosong atau kurang dari 2 kartu pilar.',
      suggestion: 'Tambahkan kartu riset pengguna pada zona UX Research di Canvas.',
      aiFixPrompt: 'Perdalam UX Research & komponen UI Figma agar 4 pilar riset lengkap.',
    });
  }

  // 3. Flow Graph Integrity & Plan Sync
  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const danglingEdges: PrdinEdge[] = edges.filter(
    (e) => !nodeIdSet.has(e.source) || !nodeIdSet.has(e.target)
  );
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
  }
  const orphanFlowNodes =
    flowNodes.length > 1 ? flowNodes.filter((n) => !connectedNodeIds.has(n.id)) : [];
  const unsyncedFlowNodes = flowNodes.filter((n) => {
    const sec = findLinkedSection(n, planSections);
    return !sec || sec.content.trim().length < 15;
  });

  if (
    flowNodes.length >= 3 &&
    danglingEdges.length === 0 &&
    orphanFlowNodes.length === 0 &&
    unsyncedFlowNodes.length === 0
  ) {
    checks.push({
      id: 'core-flow-integrity',
      category: 'flow-integrity',
      categoryLabel: 'Integritas Alur',
      title: 'Koneksi Diagram Alur & Sinkronisasi Plan Text',
      description: 'Setiap tahap alur terhubung tanpa node terputus serta sinkron 1-to-1 dengan Plan Text.',
      status: 'pass',
      severity: 'error',
      weight: 10,
      message: `${flowNodes.length} tahap flow kerja terhubung rapi dan seluruhnya sinkron dengan Plan Text.`,
    });
  } else if (flowNodes.length >= 3 && danglingEdges.length === 0) {
    const affected = Array.from(
      new Set([
        ...orphanFlowNodes.map((n) => n.id),
        ...unsyncedFlowNodes.map((n) => n.id),
      ])
    );
    checks.push({
      id: 'core-flow-integrity',
      category: 'flow-integrity',
      categoryLabel: 'Integritas Alur',
      title: 'Koneksi Diagram Alur & Sinkronisasi Plan Text',
      description: 'Setiap tahap alur terhubung tanpa node terputus serta sinkron 1-to-1 dengan Plan Text.',
      status: 'warning',
      severity: 'error',
      weight: 10,
      message:
        orphanFlowNodes.length > 0
          ? `${orphanFlowNodes.length} tahap di Canvas belum terhubung ke alur utama.`
          : `${unsyncedFlowNodes.length} tahap belum memiliki detail Plan Text yang memadai.`,
      suggestion:
        orphanFlowNodes.length > 0
          ? 'Hubungkan seluruh node alur bisnis di Canvas agar tidak ada tahap yang terisolasi.'
          : 'Lengkapi deskripsi Plan Text pada tahap yang masih kosong.',
      affectedNodeIds: affected,
    });
  } else {
    checks.push({
      id: 'core-flow-integrity',
      category: 'flow-integrity',
      categoryLabel: 'Integritas Alur',
      title: 'Koneksi Diagram Alur & Sinkronisasi Plan Text',
      description: 'Setiap tahap alur terhubung tanpa node terputus serta sinkron 1-to-1 dengan Plan Text.',
      status: 'fail',
      severity: 'error',
      weight: 10,
      message:
        danglingEdges.length > 0
          ? `Ditemukan ${danglingEdges.length} koneksi edge tidak valid (node sumber/tujuan hilang).`
          : `Tahap alur bisnis baru ${flowNodes.length} node (minimal 3 tahap: Entry, Fitur/Proses, Outcome).`,
      suggestion: 'Pastikan alur memiliki minimal 3 tahap terhubung (Awal → Proses/Fitur → Validasi/Hasil).',
      affectedNodeIds: orphanFlowNodes.map((n) => n.id),
    });
  }

  // 4. Testable User Stories, Acceptance Criteria & Edge Cases
  const incompleteDetailNodes = flowNodes.filter(
    (n) =>
      n.data.details.userStory.trim().length < 8 ||
      n.data.details.acceptanceCriteria.filter((c) => c.trim().length > 0).length === 0 ||
      n.data.details.edgeCases.filter((e) => e.trim().length > 0).length === 0
  );

  const vagueNodes = flowNodes.filter((n) =>
    n.data.details.acceptanceCriteria.some((ac) => isCriterionVague(ac))
  );

  if (flowNodes.length > 0 && incompleteDetailNodes.length === 0 && vagueNodes.length === 0) {
    checks.push({
      id: 'core-testable-criteria',
      category: 'quality-metrics',
      categoryLabel: 'Kualitas Spesifikasi',
      title: 'User Story, Acceptance Criteria Terukur & Edge Cases',
      description: 'Kriteria selesai harus dapat diuji (measurable) dan bebas kata subjektif tanpa metrik.',
      status: 'pass',
      severity: 'error',
      weight: 10,
      message: 'Seluruh tahap memiliki User Story, Acceptance Criteria terukur, dan Edge Cases.',
    });
  } else if (flowNodes.length > 0 && incompleteDetailNodes.length === 0 && vagueNodes.length > 0) {
    checks.push({
      id: 'core-testable-criteria',
      category: 'quality-metrics',
      categoryLabel: 'Kualitas Spesifikasi',
      title: 'User Story, Acceptance Criteria Terukur & Edge Cases',
      description: 'Kriteria selesai harus dapat diuji (measurable) dan bebas kata subjektif tanpa metrik.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: `${vagueNodes.length} tahap masih memakai kata subjektif (seperti "mudah"/"cepat") di Acceptance Criteria tanpa angka ukuran.`,
      suggestion:
        'Ubah kata subjektif menjadi kriteria terukur, misal "dalam <= 2 klik", "dalam <= 5 detik", atau "minimal 90% sukses".',
      affectedNodeIds: vagueNodes.map((n) => n.id),
      aiFixPrompt:
        'Perkuat Acceptance Criteria setiap tahap dengan angka/metrik terukur (misal batas detik, klik, atau persentase) dan lengkapi edge case-nya.',
    });
  } else {
    checks.push({
      id: 'core-testable-criteria',
      category: 'quality-metrics',
      categoryLabel: 'Kualitas Spesifikasi',
      title: 'User Story, Acceptance Criteria Terukur & Edge Cases',
      description: 'Kriteria selesai harus dapat diuji (measurable) dan bebas kata subjektif tanpa metrik.',
      status: 'fail',
      severity: 'error',
      weight: 10,
      message:
        flowNodes.length === 0
          ? 'Belum ada tahap alur kerja yang memiliki Acceptance Criteria & Edge Cases.'
          : `${incompleteDetailNodes.length} tahap belum memiliki User Story, Acceptance Criteria, atau Edge Cases lengkap.`,
      suggestion: 'Lengkapi User Story, minimal 1 Acceptance Criteria terukur, dan minimal 1 Edge Case per tahap.',
      affectedNodeIds: incompleteDetailNodes.map((n) => n.id),
      aiFixPrompt:
        'Perkuat Acceptance Criteria setiap tahap dengan angka/metrik terukur (misal batas detik, klik, atau persentase) dan lengkapi edge case-nya.',
    });
  }

  // 5. Non-Goals & Roadmap
  const hasNonGoals = planSections.some(
    (s) => s.category === 'non-goals' && s.content.trim().length >= 15
  );
  const hasRoadmap = roadmapTasks.length >= 1;

  if (hasNonGoals && hasRoadmap) {
    checks.push({
      id: 'core-scope-and-roadmap',
      category: 'scope-roadmap',
      categoryLabel: 'Scope & Roadmap',
      title: 'Batasan Scope (Non-Goals) & Roadmap Task',
      description: 'Menjaga fokus MVP dari scope creep dan memetakan tugas eksekusi di Roadmap.',
      status: 'pass',
      severity: 'warning',
      weight: 5,
      message: `Batasan Non-Goals terdefinisi dan ${roadmapTasks.length} task roadmap siap dilacak.`,
    });
  } else if (hasNonGoals || hasRoadmap) {
    checks.push({
      id: 'core-scope-and-roadmap',
      category: 'scope-roadmap',
      categoryLabel: 'Scope & Roadmap',
      title: 'Batasan Scope (Non-Goals) & Roadmap Task',
      description: 'Menjaga fokus MVP dari scope creep dan memetakan tugas eksekusi di Roadmap.',
      status: 'warning',
      severity: 'warning',
      weight: 5,
      message: hasNonGoals
        ? 'Batasan Non-Goals sudah ada, namun Roadmap Task masih kosong.'
        : 'Roadmap Task sudah ada, namun bagian Batasan Scope (Non-Goals) belum tertulis.',
      suggestion: hasNonGoals
        ? 'Tambahkan minimal 1 task eksekusi pada tab Roadmap Detail atau Plan Text -> Task List.'
        : 'Tuliskan fitur apa yang ditunda ke rilis berikutnya di bagian Non-Goals.',
      aiFixPrompt: !hasNonGoals
        ? 'Tambahkan Batasan Scope Non-Goals MVP agar rilis awal tetap fokus.'
        : undefined,
    });
  } else {
    checks.push({
      id: 'core-scope-and-roadmap',
      category: 'scope-roadmap',
      categoryLabel: 'Scope & Roadmap',
      title: 'Batasan Scope (Non-Goals) & Roadmap Task',
      description: 'Menjaga fokus MVP dari scope creep dan memetakan tugas eksekusi di Roadmap.',
      status: 'fail',
      severity: 'warning',
      weight: 5,
      message: 'Batasan Non-Goals dan Roadmap Task belum tersedia.',
      suggestion: 'Tambahkan batasan MVP (Non-Goals) serta pecah tahapan menjadi task di Roadmap.',
      aiFixPrompt: 'Tambahkan Batasan Scope Non-Goals MVP agar rilis awal tetap fokus.',
    });
  }

  return checks;
}

function buildUiUxProcessChecks(workspace: WorkspaceState): PrdValidationCheck[] {
  const nodes = workspace.nodes ?? [];
  const planSections = workspace.planSections ?? [];
  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');
  const startNode = flowNodes.find((n) => n.data.kind === 'flow-start') ?? flowNodes[0];
  const featureNodes = flowNodes.filter((n) => n.data.kind === 'flow-feature');
  const decisionNode = flowNodes.find((n) => n.data.kind === 'flow-decision');
  const outcomeNode = flowNodes.find((n) => n.data.kind === 'flow-outcome');
  const corpus = collectNodeCorpus(nodes, planSections);

  const checks: PrdValidationCheck[] = [];

  // 1. Research Discovery & Problem Framing
  const hasResearchKeywords =
    /(riset|audit|interview|empathy|journey|information architecture|\bia\b|benchmark|friction|problem framing|hipotesis)/.test(
      corpus
    );
  if (startNode && hasResearchKeywords && nodes.some((n) => n.data.kind === 'ux-pain')) {
    checks.push({
      id: 'uxp-research-discovery',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Fondasi Riset UX, Audit Alur & Problem Framing',
      description: 'Proses UI/UX wajib diawali riset pengguna, audit titik friction, atau pemetaan IA.',
      status: 'pass',
      severity: 'error',
      weight: 12,
      message: 'Tahap riset awal, titik friction, dan konteks pengguna terdokumentasi di alur UI/UX.',
    });
  } else if (startNode) {
    checks.push({
      id: 'uxp-research-discovery',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Fondasi Riset UX, Audit Alur & Problem Framing',
      description: 'Proses UI/UX wajib diawali riset pengguna, audit titik friction, atau pemetaan IA.',
      status: 'warning',
      severity: 'error',
      weight: 12,
      message: 'Tahap awal ada, tetapi artefak riset (audit alur, user interview, atau IA) belum eksplisit.',
      suggestion: 'Cantumkan artefak riset awal seperti Audit Alur Lama, User Journey, atau IA di node pembuka.',
      affectedNodeIds: [startNode.id],
      aiFixPrompt: 'Perdalam UX Research & komponen UI Figma agar tahap riset awal dan IA jelas.',
    });
  } else {
    checks.push({
      id: 'uxp-research-discovery',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Fondasi Riset UX, Audit Alur & Problem Framing',
      description: 'Proses UI/UX wajib diawali riset pengguna, audit titik friction, atau pemetaan IA.',
      status: 'fail',
      severity: 'error',
      weight: 12,
      message: 'Belum ada tahap fondasi riset awal pada Canvas.',
      suggestion: 'Tambahkan node tahap awal riset UX pada Business Flow.',
      aiFixPrompt: 'Perdalam UX Research & komponen UI Figma agar tahap riset awal dan IA jelas.',
    });
  }

  // 2. End-to-End User Flow & Wireframe/Prototype Artifacts
  const hasFigmaOrArtifactTerms =
    /(wireframe|user flow|prototype|figma|artifak|mockup|sketch|komponen|design system|handoff)/.test(
      corpus
    );
  const weakArtifactNodes = featureNodes.filter((n) => n.data.details.uiComponents.length < 2);

  if (featureNodes.length >= 1 && hasFigmaOrArtifactTerms && weakArtifactNodes.length === 0) {
    checks.push({
      id: 'uxp-user-flow-wireframe',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Artefak User Flow, Wireframe & Prototype Interaktif',
      description: 'Setiap tahap proses UI/UX harus menyebut artefak desain konkret (wireframe, flow, prototype).',
      status: 'pass',
      severity: 'error',
      weight: 13,
      message: `${featureNodes.length} modul artefak UI/UX sudah dilengkapi daftar komponen & artefak desain.`,
    });
  } else if (featureNodes.length >= 1) {
    checks.push({
      id: 'uxp-user-flow-wireframe',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Artefak User Flow, Wireframe & Prototype Interaktif',
      description: 'Setiap tahap proses UI/UX harus menyebut artefak desain konkret (wireframe, flow, prototype).',
      status: 'warning',
      severity: 'error',
      weight: 13,
      message: 'Beberapa tahap UI/UX belum merinci minimal 2 artefak/komponen Figma yang harus dibuat.',
      suggestion: 'Pastikan setiap tahap UI/UX mencantumkan minimal 2 artefak desain (misal Wireframe, Flow, Prototype).',
      affectedNodeIds: weakArtifactNodes.map((n) => n.id),
      aiFixPrompt: 'Perdalam UX Research & komponen UI Figma untuk setiap tahap desain.',
    });
  } else {
    checks.push({
      id: 'uxp-user-flow-wireframe',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Artefak User Flow, Wireframe & Prototype Interaktif',
      description: 'Setiap tahap proses UI/UX harus menyebut artefak desain konkret (wireframe, flow, prototype).',
      status: 'fail',
      severity: 'error',
      weight: 13,
      message: 'Belum ada node artefak inti UI/UX (User Flow / Wireframe / Prototype) di alur.',
      suggestion: 'Tambahkan minimal 1 tahap artefak utama seperti Wireframe Layar Inti atau User Flow Diagram.',
    });
  }

  // 3. 4 UI States Coverage (Normal, Loading, Empty, Error)
  const stateHits = [
    /\b(normal|default)\b/.test(corpus),
    /\bloading\b/.test(corpus),
    /\bempty\b|data kosong/.test(corpus),
    /\berror\b|gagal|input tidak valid/.test(corpus),
  ].filter(Boolean).length;

  if (stateHits >= 4 || /4 state|empat state/.test(corpus)) {
    checks.push({
      id: 'uxp-ui-states-coverage',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Kelengkapan 4 State Layar (Normal, Loading, Empty, Error)',
      description: 'Desain UI profesional tidak hanya menggambar kondisi ideal, tetapi juga state kosong, loading, dan error.',
      status: 'pass',
      severity: 'warning',
      weight: 10,
      message: 'Keempat kondisi layar (Normal, Loading, Empty, Error) sudah tercakup dalam spesifikasi desain.',
    });
  } else if (stateHits >= 2) {
    checks.push({
      id: 'uxp-ui-states-coverage',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Kelengkapan 4 State Layar (Normal, Loading, Empty, Error)',
      description: 'Desain UI profesional tidak hanya menggambar kondisi ideal, tetapi juga state kosong, loading, dan error.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: `Baru ${stateHits}/4 kondisi state layar yang tertulis eksplisit (Normal, Loading, Empty, Error).`,
      suggestion: 'Tambahkan dokumentasi untuk seluruh 4 state layar beserta tampilan saat layar mobile 360px/375px.',
      aiFixPrompt:
        'Tambahkan spesifikasi 4 state layar (Normal, Loading, Empty, Error), Design System & Handoff Developer.',
    });
  } else {
    checks.push({
      id: 'uxp-ui-states-coverage',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Kelengkapan 4 State Layar (Normal, Loading, Empty, Error)',
      description: 'Desain UI profesional tidak hanya menggambar kondisi ideal, tetapi juga state kosong, loading, dan error.',
      status: 'fail',
      severity: 'warning',
      weight: 10,
      message: 'Spesifikasi state layar (Normal, Loading, Empty, Error) belum terdokumentasi.',
      suggestion: 'Sertakan checklist 4 state layar agar tim frontend tidak kebingungan saat implementasi.',
      aiFixPrompt:
        'Tambahkan spesifikasi 4 state layar (Normal, Loading, Empty, Error), Design System & Handoff Developer.',
    });
  }

  // 4. Usability Testing & Design Review Gate
  const hasUsabilityTerms = /(usability|user test|uji coba|design review|prototype|skenario tugas|evaluasi)/.test(
    corpus
  );
  if (decisionNode && hasUsabilityTerms) {
    checks.push({
      id: 'uxp-usability-testing',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Gerbang Usability Testing & Design Review',
      description: 'Desain divalidasi ke pengguna nyata atau di-review sebelum masuk tahap coding.',
      status: 'pass',
      severity: 'error',
      weight: 10,
      message: `Tahap "${decisionNode.data.title}" memvalidasi usability & kelengkapan desain sebelum handoff.`,
    });
  } else if (decisionNode) {
    checks.push({
      id: 'uxp-usability-testing',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Gerbang Usability Testing & Design Review',
      description: 'Desain divalidasi ke pengguna nyata atau di-review sebelum masuk tahap coding.',
      status: 'warning',
      severity: 'error',
      weight: 10,
      message: 'Tahap keputusan sudah ada, namun belum menegaskan skenario Usability Testing atau Design Review.',
      suggestion: 'Tambahkan kriteria lolos usability (misal >= 80% task completion) pada node decision.',
      affectedNodeIds: [decisionNode.id],
    });
  } else {
    checks.push({
      id: 'uxp-usability-testing',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Gerbang Usability Testing & Design Review',
      description: 'Desain divalidasi ke pengguna nyata atau di-review sebelum masuk tahap coding.',
      status: 'fail',
      severity: 'error',
      weight: 10,
      message: 'Belum ada node gerbang Usability Testing / Design Review pada alur desain.',
      suggestion: 'Tambahkan node decision Usability Testing sebelum tahap Handoff.',
      aiFixPrompt: 'Tambah alur validasi Usability Testing & Design Review sebelum Handoff.',
    });
  }

  // 5. Developer Handoff, Design System & Accessibility
  const hasHandoffTerms = /(handoff|dev mode|token|design system|microcopy|qa desain)/.test(corpus);
  const hasAccessibilityTerms = /(aksesibilitas|wcag|kontras|tap target|44x44|24x24|keyboard|fokus)/.test(
    corpus
  );
  if (outcomeNode && hasHandoffTerms && hasAccessibilityTerms) {
    checks.push({
      id: 'uxp-handoff-design-system',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Spesifikasi Handoff Developer, Design System & Aksesibilitas',
      description: 'Mencakup panduan token desain, microcopy, standar kontras/tap-target, dan QA desain.',
      status: 'pass',
      severity: 'warning',
      weight: 10,
      message: 'Handoff developer, komponen/token Design System, serta standar aksesibilitas sudah tercatat.',
    });
  } else if (outcomeNode && hasHandoffTerms) {
    checks.push({
      id: 'uxp-handoff-design-system',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Spesifikasi Handoff Developer, Design System & Aksesibilitas',
      description: 'Mencakup panduan token desain, microcopy, standar kontras/tap-target, dan QA desain.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: 'Tahap handoff sudah tersedia, namun standar aksesibilitas (kontras WCAG AA >= 4.5:1 & ukuran tap target) belum tercatat.',
      suggestion: 'Tambahkan Spesifikasi Teknis UI/UX (token warna, kontras >= 4.5:1, ukuran tap target, dan checklist Dev Mode).',
      affectedNodeIds: [outcomeNode.id],
      aiFixPrompt:
        'Tambahkan spesifikasi Handoff Developer, Design System Token, dan standar aksesibilitas kontras WCAG.',
    });
  } else {
    checks.push({
      id: 'uxp-handoff-design-system',
      category: 'purpose-specific',
      categoryLabel: 'Validasi UI/UX Proses',
      title: 'Spesifikasi Handoff Developer, Design System & Aksesibilitas',
      description: 'Mencakup panduan token desain, microcopy, standar kontras/tap-target, dan QA desain.',
      status: 'fail',
      severity: 'warning',
      weight: 10,
      message: 'Tahap Handoff Developer & Design System belum terdefinisi dengan lengkap.',
      suggestion: 'Tambahkan spesifikasi handoff Figma Dev Mode, token komponen, dan standar aksesibilitas.',
      aiFixPrompt:
        'Tambahkan spesifikasi Handoff Developer, Design System Token, dan standar aksesibilitas kontras WCAG.',
    });
  }

  return checks;
}

function buildWebsiteChecks(workspace: WorkspaceState): PrdValidationCheck[] {
  const nodes = workspace.nodes ?? [];
  const edges = workspace.edges ?? [];
  const planSections = workspace.planSections ?? [];
  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');
  const startNode = flowNodes.find((n) => n.data.kind === 'flow-start') ?? flowNodes[0];
  const featureNodes = flowNodes.filter((n) => n.data.kind === 'flow-feature');
  const decisionNode = flowNodes.find((n) => n.data.kind === 'flow-decision');
  const outcomeNode = flowNodes.find((n) => n.data.kind === 'flow-outcome');
  const valueNode = nodes.find((n) => n.data.kind === 'ux-value');
  const retentionNode = nodes.find((n) => n.data.kind === 'ux-retention');
  const corpus = collectNodeCorpus(nodes, planSections);

  const checks: PrdValidationCheck[] = [];

  // 1. Landing Entry, Value Prop & CTA Clarity
  if (
    startNode &&
    startNode.data.details.uiComponents.length >= 2 &&
    valueNode &&
    valueNode.data.subtitle.trim().length >= 5
  ) {
    checks.push({
      id: 'web-entry-value-prop',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Kejelasan Landing Entry, Value Proposition & CTA Utama',
      description: 'Pengunjung website harus langsung paham nilai produk dan aksi utama sejak halaman pembuka.',
      status: 'pass',
      severity: 'error',
      weight: 12,
      message: 'Halaman pembuka, value proposition, dan komponen CTA utama sudah terdefinisi.',
    });
  } else if (startNode) {
    checks.push({
      id: 'web-entry-value-prop',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Kejelasan Landing Entry, Value Proposition & CTA Utama',
      description: 'Pengunjung website harus langsung paham nilai produk dan aksi utama sejak halaman pembuka.',
      status: 'warning',
      severity: 'error',
      weight: 12,
      message: 'Tahap masuk website ada, tetapi komponen CTA/hero atau kartu value proposition belum lengkap.',
      suggestion: 'Lengkapi komponen Above-the-Fold Hero, Primary CTA, dan kartu Daya Tarik Utama (Q4).',
      affectedNodeIds: [startNode.id],
    });
  } else {
    checks.push({
      id: 'web-entry-value-prop',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Kejelasan Landing Entry, Value Proposition & CTA Utama',
      description: 'Pengunjung website harus langsung paham nilai produk dan aksi utama sejak halaman pembuka.',
      status: 'fail',
      severity: 'error',
      weight: 12,
      message: 'Belum ada node halaman pembuka / landing entry pada alur website.',
      suggestion: 'Tambahkan node entry halaman utama beserta CTA utamanya.',
    });
  }

  // 2. Page Structure, Navigation & Content Flow
  const hasFeatureToOutcomePath =
    featureNodes.length >= 1 &&
    Boolean(outcomeNode) &&
    edges.some((e) => e.target === outcomeNode?.id);

  if (featureNodes.length >= 1 && hasFeatureToOutcomePath) {
    checks.push({
      id: 'web-information-architecture',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Struktur Halaman, Navigasi & Alur Konten Web',
      description: 'Halaman/section inti website saling terhubung dari entry hingga tujuan konversi tanpa jalan buntu.',
      status: 'pass',
      severity: 'error',
      weight: 11,
      message: `${featureNodes.length} halaman/fitur web tersusun berurutan menuju tahap hasil akhir.`,
    });
  } else if (featureNodes.length >= 1) {
    checks.push({
      id: 'web-information-architecture',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Struktur Halaman, Navigasi & Alur Konten Web',
      description: 'Halaman/section inti website saling terhubung dari entry hingga tujuan konversi tanpa jalan buntu.',
      status: 'warning',
      severity: 'error',
      weight: 11,
      message: 'Fitur/halaman web sudah ada, namun jalur koneksi ke tahap hasil akhir belum terhubung utuh.',
      suggestion: 'Pastikan seluruh halaman/fitur web terhubung berurutan hingga tahap konversi akhir.',
      affectedNodeIds: featureNodes.map((n) => n.id),
    });
  } else {
    checks.push({
      id: 'web-information-architecture',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Struktur Halaman, Navigasi & Alur Konten Web',
      description: 'Halaman/section inti website saling terhubung dari entry hingga tujuan konversi tanpa jalan buntu.',
      status: 'fail',
      severity: 'error',
      weight: 11,
      message: 'Belum ada blok fitur atau halaman inti website yang terdefinisi.',
      suggestion: 'Tambahkan minimal 1 halaman/fitur inti website di Business Flow.',
    });
  }

  // 3. Conversion Funnel & Validation
  const hasErrorHandlingOnConversion =
    Boolean(decisionNode?.data.details.edgeCases.length) ||
    featureNodes.some((n) => n.data.details.edgeCases.length > 0);

  if (decisionNode && outcomeNode && hasErrorHandlingOnConversion) {
    checks.push({
      id: 'web-conversion-funnel',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Alur Konversi, Validasi Input & Konfirmasi Sukses',
      description: 'Website harus memiliki tahap verifikasi form/aksi dan layar konfirmasi konversi yang jelas.',
      status: 'pass',
      severity: 'error',
      weight: 12,
      message: 'Alur verifikasi konversi, penanganan input tidak valid, dan konfirmasi hasil sudah lengkap.',
    });
  } else if (decisionNode || outcomeNode) {
    checks.push({
      id: 'web-conversion-funnel',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Alur Konversi, Validasi Input & Konfirmasi Sukses',
      description: 'Website harus memiliki tahap verifikasi form/aksi dan layar konfirmasi konversi yang jelas.',
      status: 'warning',
      severity: 'error',
      weight: 12,
      message: 'Alur konversi belum memiliki keduanya: gerbang validasi input dan layar konfirmasi sukses.',
      suggestion: 'Lengkapi tahap Validasi/Konfirmasi dan tahap Hasil Sukses beserta edge case input gagal.',
      aiFixPrompt: 'Tambah alur validasi & konfirmasi konversi website beserta penanganan input gagal.',
    });
  } else {
    checks.push({
      id: 'web-conversion-funnel',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Alur Konversi, Validasi Input & Konfirmasi Sukses',
      description: 'Website harus memiliki tahap verifikasi form/aksi dan layar konfirmasi konversi yang jelas.',
      status: 'fail',
      severity: 'error',
      weight: 12,
      message: 'Tahap konversi dan konfirmasi hasil website belum ada.',
      suggestion: 'Tambahkan tahap Validasi Input dan Konfirmasi Sukses di akhir funnel website.',
      aiFixPrompt: 'Tambah alur validasi & konfirmasi konversi website beserta penanganan input gagal.',
    });
  }

  // 4. Responsive Mobile, SEO & Web Performance NFRs
  const hasResponsive = /(responsif|responsive|mobile|360px|375px|breakpoint|hp & desktop|hp\/desktop)/.test(
    corpus
  );
  const hasPerformance = /(lcp|cls\b|core web vitals|performa web|target performa|kecepatan muat|page speed|waktu muat)/.test(
    corpus
  );
  const hasSeoA11y = /(\bseo\b|meta\s*description|open graph|heading h1|aksesibilitas|wcag|lighthouse)/.test(
    corpus
  );
  const webNfrCount = [hasResponsive, hasPerformance, hasSeoA11y].filter(Boolean).length;

  if (webNfrCount >= 2 && hasSeoA11y) {
    checks.push({
      id: 'web-responsive-seo-performance',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Standar Teknis Web: Responsif Mobile, SEO & Performa',
      description: 'PRD Website perlu menetapkan target tampilan mobile, metadata SEO/aksesibilitas, dan kecepatan muat.',
      status: 'pass',
      severity: 'warning',
      weight: 10,
      message: `Aspek teknis web tercakup (${[
        hasResponsive ? 'Responsif' : null,
        hasPerformance ? 'Performa' : null,
        hasSeoA11y ? 'SEO/Aksesibilitas' : null,
      ]
        .filter(Boolean)
        .join(', ')}).`,
    });
  } else if (webNfrCount === 1) {
    checks.push({
      id: 'web-responsive-seo-performance',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Standar Teknis Web: Responsif Mobile, SEO & Performa',
      description: 'PRD Website perlu menetapkan target tampilan mobile, metadata SEO/aksesibilitas, dan kecepatan muat.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: 'Baru 1 dari 3 pilar teknis website (Responsif Mobile, SEO/Metadata, Target Performa/LCP) yang tertulis.',
      suggestion:
        'Tambahkan spesifikasi target viewport mobile (375px), metadata SEO/Open Graph, dan target kecepatan LCP <= 2.5 detik.',
      aiFixPrompt:
        'Tambahkan Spesifikasi Teknis Website yang mencakup target responsif mobile (375px), standar SEO & Open Graph, serta target performa (LCP <= 2.5 detik).',
    });
  } else {
    checks.push({
      id: 'web-responsive-seo-performance',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Standar Teknis Web: Responsif Mobile, SEO & Performa',
      description: 'PRD Website perlu menetapkan target tampilan mobile, metadata SEO/aksesibilitas, dan kecepatan muat.',
      status: 'fail',
      severity: 'warning',
      weight: 10,
      message: 'Spesifikasi teknis website (Responsif Mobile, SEO, dan Performa LCP) belum terdokumentasi.',
      suggestion:
        'Tambahkan catatan spesifikasi teknis web agar website siap tayang dan ramah mesin pencari.',
      aiFixPrompt:
        'Tambahkan Spesifikasi Teknis Website yang mencakup target responsif mobile (375px), standar SEO & Open Graph, serta target performa (LCP <= 2.5 detik).',
    });
  }

  // 5. Retention & Repeat Visit
  if (
    retentionNode &&
    retentionNode.data.subtitle.trim().length >= 5 &&
    outcomeNode &&
    outcomeNode.data.details.acceptanceCriteria.length >= 1
  ) {
    checks.push({
      id: 'web-retention-analytics',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Mekanisme Kunjungan Ulang & Tindak Lanjut Pengunjung',
      description: 'Pengunjung yang selesai berinteraksi punya alasan jelas untuk kembali atau membagikan website.',
      status: 'pass',
      severity: 'warning',
      weight: 10,
      message: 'Mekanisme kunjungan ulang (Q5) sudah terhubung ke tahap hasil akhir website.',
    });
  } else {
    checks.push({
      id: 'web-retention-analytics',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Website',
      title: 'Mekanisme Kunjungan Ulang & Tindak Lanjut Pengunjung',
      description: 'Pengunjung yang selesai berinteraksi punya alasan jelas untuk kembali atau membagikan website.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: 'Alasan pengunjung kembali lagi belum terintegrasi utuh dengan tahap akhir website.',
      suggestion: 'Tambahkan mekanisme tindak lanjut seperti riwayat pesanan, link WhatsApp/email, atau bookmark.',
      affectedNodeIds: outcomeNode ? [outcomeNode.id] : undefined,
    });
  }

  return checks;
}

function buildApplicationChecks(workspace: WorkspaceState): PrdValidationCheck[] {
  const nodes = workspace.nodes ?? [];
  const planSections = workspace.planSections ?? [];
  const flowNodes = nodes.filter((n) => n.data.zone === 'business-flow');
  const startNode = flowNodes.find((n) => n.data.kind === 'flow-start') ?? flowNodes[0];
  const featureNodes = flowNodes.filter((n) => n.data.kind === 'flow-feature');
  const outcomeNode = flowNodes.find((n) => n.data.kind === 'flow-outcome');
  const retentionNode = nodes.find((n) => n.data.kind === 'ux-retention');
  const corpus = collectNodeCorpus(nodes, planSections);

  const checks: PrdValidationCheck[] = [];

  // 1. App Onboarding & Entry Access
  if (
    startNode &&
    startNode.data.details.uiComponents.length >= 2 &&
    startNode.data.details.edgeCases.length >= 1
  ) {
    checks.push({
      id: 'app-onboarding-auth-entry',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Alur Onboarding Pertama & Akses Awal Aplikasi',
      description: 'Aplikasi wajib menjelaskan pengalaman buka pertama (login/guest mode/setup) beserta kondisi data kosong.',
      status: 'pass',
      severity: 'error',
      weight: 12,
      message: 'Tahap onboarding awal aplikasi, komponen UI, dan skenario skip/data kosong sudah jelas.',
    });
  } else if (startNode) {
    checks.push({
      id: 'app-onboarding-auth-entry',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Alur Onboarding Pertama & Akses Awal Aplikasi',
      description: 'Aplikasi wajib menjelaskan pengalaman buka pertama (login/guest mode/setup) beserta kondisi data kosong.',
      status: 'warning',
      severity: 'error',
      weight: 12,
      message: 'Tahap masuk aplikasi ada, namun komponen onboarding atau edge case data awal belum lengkap.',
      suggestion: 'Jelaskan komponen layar awal dan skenario saat pengguna melewati onboarding atau datanya masih kosong.',
      affectedNodeIds: [startNode.id],
    });
  } else {
    checks.push({
      id: 'app-onboarding-auth-entry',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Alur Onboarding Pertama & Akses Awal Aplikasi',
      description: 'Aplikasi wajib menjelaskan pengalaman buka pertama (login/guest mode/setup) beserta kondisi data kosong.',
      status: 'fail',
      severity: 'error',
      weight: 12,
      message: 'Tahap onboarding / entry aplikasi belum tersedia di flow.',
      suggestion: 'Tambahkan node entry onboarding/akses aplikasi.',
    });
  }

  // 2. Core Modules, Actors & App Navigation
  const weakModuleNodes = featureNodes.filter(
    (n) => n.data.details.actor.trim().length < 2 || n.data.details.uiComponents.length < 2
  );
  if (featureNodes.length >= 1 && weakModuleNodes.length === 0) {
    checks.push({
      id: 'app-core-modules-actors',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Kelengkapan Modul Inti, Aktor & Komponen Layar App',
      description: 'Setiap modul aplikasi memiliki aktor/role yang jelas, user story, dan komponen layar/navigasi.',
      status: 'pass',
      severity: 'error',
      weight: 11,
      message: `${featureNodes.length} modul inti aplikasi terdefinisi lengkap beserta aktor dan komponen UI.`,
    });
  } else if (featureNodes.length >= 1) {
    checks.push({
      id: 'app-core-modules-actors',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Kelengkapan Modul Inti, Aktor & Komponen Layar App',
      description: 'Setiap modul aplikasi memiliki aktor/role yang jelas, user story, dan komponen layar/navigasi.',
      status: 'warning',
      severity: 'error',
      weight: 11,
      message: `${weakModuleNodes.length} modul aplikasi belum memiliki aktor atau minimal 2 komponen layar.`,
      suggestion: 'Lengkapi aktor pengguna dan minimal 2 komponen UI (misal App Shell, Card, Toast) di tiap modul.',
      affectedNodeIds: weakModuleNodes.map((n) => n.id),
    });
  } else {
    checks.push({
      id: 'app-core-modules-actors',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Kelengkapan Modul Inti, Aktor & Komponen Layar App',
      description: 'Setiap modul aplikasi memiliki aktor/role yang jelas, user story, dan komponen layar/navigasi.',
      status: 'fail',
      severity: 'error',
      weight: 11,
      message: 'Belum ada modul fitur inti aplikasi yang ditambahkan.',
      suggestion: 'Tambahkan minimal 1 modul fitur wajib aplikasi pada Business Flow.',
    });
  }

  // 3. System States, Offline & Error Recovery
  const hasLoadingEmpty = /(loading|empty|data kosong|placeholder|skeleton)/.test(corpus);
  const hasNetworkRecovery = /(offline|koneksi|jaringan|timeout|retry|coba lagi|sinkron|sync|pemulihan)/.test(
    corpus
  );

  if (hasLoadingEmpty && hasNetworkRecovery) {
    checks.push({
      id: 'app-system-states-offline',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Penanganan System State, Offline & Error Recovery',
      description: 'Aplikasi harus menangani loading, empty state, koneksi putus/offline, serta aksi retry dengan aman.',
      status: 'pass',
      severity: 'error',
      weight: 12,
      message: 'Penanganan state loading/empty serta pemulihan gangguan jaringan/offline sudah tercatat.',
    });
  } else if (hasLoadingEmpty || hasNetworkRecovery) {
    checks.push({
      id: 'app-system-states-offline',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Penanganan System State, Offline & Error Recovery',
      description: 'Aplikasi harus menangani loading, empty state, koneksi putus/offline, serta aksi retry dengan aman.',
      status: 'warning',
      severity: 'error',
      weight: 12,
      message: hasLoadingEmpty
        ? 'State loading/empty sudah ada, tetapi skenario Offline / Koneksi Putus & Retry belum terdokumentasi.'
        : 'Skenario jaringan ada, tetapi Loading Skeleton / Empty State belum eksplisit.',
      suggestion:
        'Tambahkan spesifikasi handling saat offline/timeout (antrean lokal atau tombol retry) di aplikasi.',
      aiFixPrompt:
        'Tambahkan Spesifikasi Teknis Aplikasi: penanganan Offline/Koneksi Putus, Loading Skeleton, Retry, integrasi API & keamanan.',
    });
  } else {
    checks.push({
      id: 'app-system-states-offline',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Penanganan System State, Offline & Error Recovery',
      description: 'Aplikasi harus menangani loading, empty state, koneksi putus/offline, serta aksi retry dengan aman.',
      status: 'fail',
      severity: 'error',
      weight: 12,
      message: 'Penanganan system state (Loading, Empty, Offline/Timeout, Retry) belum terdokumentasi.',
      suggestion: 'Pastikan setiap modul aplikasi memiliki rencana penanganan offline, loading, dan error recovery.',
      aiFixPrompt:
        'Tambahkan Spesifikasi Teknis Aplikasi: penanganan Offline/Koneksi Putus, Loading Skeleton, Retry, integrasi API & keamanan.',
    });
  }

  // 4. API Integration, Data Sync, Auth/Security & Performance NFR
  const hasTechSpecsSection = planSections.some(
    (s) => s.category === 'specs' && s.content.trim().length >= 30
  );
  const hasApiOrStorage = /(api|database|storage|sinkron|sync|backend|webhook|cache)/.test(corpus);
  const hasAuthOrSecurity = /(auth|autentikasi|otorisasi|role|hak akses|keamanan|enkripsi|privasi|token)/.test(
    corpus
  );
  const hasAppPerf = /(response time|latency|\b\d+\s*ms\b|target performa|fps|p95)/.test(corpus);
  const techPillars = [hasApiOrStorage, hasAuthOrSecurity, hasAppPerf].filter(Boolean).length;

  if ((hasTechSpecsSection && techPillars >= 2) || techPillars >= 3) {
    checks.push({
      id: 'app-integration-security-nfr',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Spesifikasi Integrasi API/Data, Keamanan & Performa App',
      description: 'Menjelaskan kebutuhan integrasi data, hak akses/keamanan pengguna, dan batas performa aplikasi.',
      status: 'pass',
      severity: 'warning',
      weight: 10,
      message: 'Spesifikasi integrasi data/API, kontrol akses keamanan, dan target performa aplikasi sudah tercakup.',
    });
  } else if (techPillars >= 1 || hasTechSpecsSection) {
    checks.push({
      id: 'app-integration-security-nfr',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Spesifikasi Integrasi API/Data, Keamanan & Performa App',
      description: 'Menjelaskan kebutuhan integrasi data, hak akses/keamanan pengguna, dan batas performa aplikasi.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: 'Spesifikasi teknis aplikasi (API/database, keamanan/role, dan target response time) masih parsial.',
      suggestion:
        'Tambahkan bagian Spesifikasi Teknis Aplikasi yang merinci integrasi API/storage, kontrol akses, dan target response time <= 300ms.',
      aiFixPrompt:
        'Tambahkan Spesifikasi Teknis Aplikasi: arsitektur integrasi API & penyimpanan data, kontrol akses/keamanan, serta target performa (response time <= 300ms).',
    });
  } else {
    checks.push({
      id: 'app-integration-security-nfr',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Spesifikasi Integrasi API/Data, Keamanan & Performa App',
      description: 'Menjelaskan kebutuhan integrasi data, hak akses/keamanan pengguna, dan batas performa aplikasi.',
      status: 'fail',
      severity: 'warning',
      weight: 10,
      message: 'Belum ada spesifikasi teknis integrasi data, keamanan/role, maupun target performa aplikasi.',
      suggestion: 'Tambahkan bagian Spesifikasi Teknis Aplikasi agar engineer dapat merancang arsitektur dengan tepat.',
      aiFixPrompt:
        'Tambahkan Spesifikasi Teknis Aplikasi: arsitektur integrasi API & penyimpanan data, kontrol akses/keamanan, serta target performa (response time <= 300ms).',
    });
  }

  // 5. App Retention & Notification Loop
  const hasRetentionTerms = /(riwayat|history|notifikasi|pengingat|reminder|progres|streak|loyalitas|sinkron|sinkronisasi)/.test(
    corpus
  );
  if (retentionNode && outcomeNode && hasRetentionTerms) {
    checks.push({
      id: 'app-retention-notification-loop',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Mekanisme Retensi, Riwayat & Pengingat Aktif',
      description: 'Aplikasi memiliki pemicu agar pengguna kembali memakai fitur secara berkala.',
      status: 'pass',
      severity: 'warning',
      weight: 10,
      message: 'Loop retensi (riwayat/notifikasi/pengingat) terhubung jelas ke hasil akhir aplikasi.',
    });
  } else {
    checks.push({
      id: 'app-retention-notification-loop',
      category: 'purpose-specific',
      categoryLabel: 'Validasi Aplikasi',
      title: 'Mekanisme Retensi, Riwayat & Pengingat Aktif',
      description: 'Aplikasi memiliki pemicu agar pengguna kembali memakai fitur secara berkala.',
      status: 'warning',
      severity: 'warning',
      weight: 10,
      message: 'Mekanisme retensi atau pengingat pemakaian ulang belum tertulis jelas di alur akhir aplikasi.',
      suggestion: 'Sertakan mekanisme riwayat tersimpan, notifikasi, atau pengingat progres di tahap akhir.',
      affectedNodeIds: outcomeNode ? [outcomeNode.id] : undefined,
    });
  }

  return checks;
}

export function validateWorkspacePrd(
  workspace: WorkspaceState,
  targetPurposeOverride?: PrdPurpose
): PrdValidationResult {
  const prdPurpose = targetPurposeOverride ?? workspace.discovery?.prdPurpose ?? 'website';
  const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];

  const coreChecks = buildCoreChecks(workspace);
  const purposeChecks =
    prdPurpose === 'ui-ux-process'
      ? buildUiUxProcessChecks(workspace)
      : prdPurpose === 'application'
      ? buildApplicationChecks(workspace)
      : buildWebsiteChecks(workspace);

  const checks = [...coreChecks, ...purposeChecks];

  const totalWeight = checks.reduce((acc, c) => acc + c.weight, 0);
  const earnedWeight = checks.reduce((acc, c) => {
    if (c.status === 'pass') return acc + c.weight;
    if (c.status === 'warning') return acc + c.weight * 0.5;
    return acc;
  }, 0);

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const passed = checks.filter((c) => c.status === 'pass').length;
  const warnings = checks.filter((c) => c.status === 'warning').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const hasCriticalFail = checks.some((c) => c.status === 'fail' && c.severity === 'error');

  let status: PrdValidationResult['status'];
  let statusLabel: string;
  if (!hasCriticalFail && score >= 80) {
    status = 'ready';
    statusLabel = 'Siap Eksekusi';
  } else if (!hasCriticalFail && score >= 55) {
    status = 'needs-improvement';
    statusLabel = 'Perlu Penyempurnaan';
  } else {
    status = 'incomplete';
    statusLabel = 'Belum Lengkap';
  }

  const recommendations = checks
    .filter((c) => c.status !== 'pass')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'fail' ? -1 : 1;
      if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
      return b.weight - a.weight;
    })
    .map((c) => c.suggestion ?? c.message)
    .slice(0, 5);

  return {
    prdPurpose,
    purposeLabel: purposeMeta.label,
    score,
    status,
    statusLabel,
    summary: {
      passed,
      warnings,
      failed,
      total: checks.length,
    },
    checks,
    recommendations,
  };
}

export function validateDiscoveryReadiness(discovery: DiscoveryState): DiscoveryValidationResult {
  const prdPurpose = discovery.prdPurpose ?? 'website';
  const purposeLabel = PRD_PURPOSE_MAP[prdPurpose].label;
  const q1 = discovery.q1Summary;
  const q2Count = discovery.questions.q2.selectedTagIds.length;
  const q3Count = discovery.questions.q3.selectedTagIds.length;
  const q4Count = discovery.questions.q4.selectedTagIds.length;
  const q5Count = discovery.questions.q5.selectedTagIds.length;

  const checks: DiscoveryValidationCheck[] = [
    {
      id: 'disc-q1',
      title: 'Konteks Q1 (Persona, Masalah & Tujuan)',
      passed: Boolean(q1 && q1.persona.trim().length >= 5 && q1.painPoint.trim().length >= 5),
      severity: 'error',
      message: q1
        ? `Persona "${q1.persona}" & masalah utama sudah terdeteksi untuk mode ${purposeLabel}.`
        : 'Kirim cerita di Pertanyaan 1 terlebih dahulu.',
    },
    {
      id: 'disc-q2',
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Q2: Fondasi Riset UI/UX Dipilih'
          : prdPurpose === 'application'
          ? 'Q2: Onboarding Awal Aplikasi Dipilih'
          : 'Q2: Pintu Masuk Halaman Web Dipilih',
      passed: q2Count >= discovery.questions.q2.minSelect,
      severity: 'error',
      message: q2Count >= 1 ? `${q2Count} langkah awal dipilih.` : 'Pilih minimal 1 langkah awal di Q2.',
    },
    {
      id: 'disc-q3',
      title:
        prdPurpose === 'ui-ux-process'
          ? 'Q3: Artefak Wajib UI/UX (Disarankan >= 3)'
          : prdPurpose === 'application'
          ? 'Q3: Modul Inti Aplikasi (Disarankan >= 3)'
          : 'Q3: Halaman/Fitur Inti Website (Disarankan >= 3)',
      passed: q3Count >= 3,
      severity: q3Count >= 1 ? 'warning' : 'error',
      message:
        q3Count >= 3
          ? `${q3Count} prioritas inti siap dipetakan ke flow PRD.`
          : q3Count >= 1
          ? `Baru ${q3Count} prioritas dipilih; disarankan minimal 3 agar alur ${purposeLabel} komprehensif.`
          : 'Pilih minimal 1 prioritas wajib di Q3.',
    },
    {
      id: 'disc-q4-q5',
      title: 'Q4 & Q5: Kriteria Value & Retensi/Reuse',
      passed: q4Count >= 1 && q5Count >= 1,
      severity: 'error',
      message:
        q4Count >= 1 && q5Count >= 1
          ? 'Pemicu adopsi (Q4) dan mekanisme keberlanjutan (Q5) sudah lengkap.'
          : 'Pilih minimal 1 tag pada Q4 dan Q5.',
    },
  ];

  const readyToGenerate =
    Boolean(q1) &&
    q2Count >= discovery.questions.q2.minSelect &&
    q3Count >= discovery.questions.q3.minSelect &&
    q4Count >= discovery.questions.q4.minSelect &&
    q5Count >= discovery.questions.q5.minSelect;

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const biz = discovery.businessContext;
  const businessChecks: DiscoveryValidationCheck[] = [
    {
      id: 'biz-kpi',
      title: 'Target KPI Bisnis Terukur',
      passed: Boolean(biz?.successMetrics && biz.successMetrics.trim().length >= 8),
      severity: 'warning',
      message:
        biz?.successMetrics && biz.successMetrics.trim().length >= 8
          ? 'Target keberhasilan bisnis sudah terisi.'
          : 'Tambahkan ukuran sukses terukur (contoh: >= 8% konversi atau <= 3 menit selesai).',
    },
    {
      id: 'biz-roles',
      title: 'Peran Aktor & Aturan Bisnis',
      passed: Boolean(biz?.userRolesAndRules && biz.userRolesAndRules.trim().length >= 8),
      severity: 'warning',
      message:
        biz?.userRolesAndRules && biz.userRolesAndRules.trim().length >= 8
          ? 'Peran aktor & aturan bisnis sudah terdefinisi.'
          : 'Opsional: cantumkan perbedaan role (misal Admin vs User) dan aturan bisnis utama.',
    },
    {
      id: 'biz-nongoals',
      title: 'Batasan Scope / Non-Goals MVP',
      passed: Boolean(biz?.nonGoals && biz.nonGoals.trim().length >= 8),
      severity: 'warning',
      message:
        biz?.nonGoals && biz.nonGoals.trim().length >= 8
          ? 'Batasan scope (Non-Goals) eksplisit sudah tercatat.'
          : 'Opsional: tuliskan fitur yang sengaja ditunda agar MVP tidak melebar.',
    },
    {
      id: 'biz-tech',
      title: 'Batasan Teknis & NFR (Keamanan, Performa, Desain)',
      passed: Boolean(biz?.technicalConstraints && biz.technicalConstraints.trim().length >= 8),
      severity: 'warning',
      message:
        biz?.technicalConstraints && biz.technicalConstraints.trim().length >= 8
          ? 'Batasan teknis & standar NFR sudah terisi.'
          : 'Opsional: cantumkan target performa, responsif, SEO, keamanan, atau standar Figma.',
    },
  ];
  const businessPassedCount = businessChecks.filter((c) => c.passed).length;
  const businessScore = Math.round((businessPassedCount / businessChecks.length) * 100);

  return {
    prdPurpose,
    purposeLabel,
    readyToGenerate,
    score,
    checks,
    businessScore,
    businessChecks,
  };
}
