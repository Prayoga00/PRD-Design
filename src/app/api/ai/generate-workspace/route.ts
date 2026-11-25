import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callStructuredJsonLlm } from '@/lib/ai/provider';
import {
  AdaptiveQuestionConfigSchema,
  GenerateWorkspaceOutputSchema,
  PrdBusinessContextSchema,
  PrdPurposeSchema,
  Q1ExtractedSummarySchema,
} from '@/lib/schemas/ai-contracts';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
} from '@/lib/engine/smart-fallback';
import type { AiProviderChoice, DiscoveryState } from '@/lib/types/prdin';

const GenerateWorkspaceRequestSchema = z.object({
  discovery: z.object({
    prdPurpose: PrdPurposeSchema.default('website'),
    q1Messages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    ),
    q1Summary: Q1ExtractedSummarySchema.nullable(),
    questions: z.object({
      q2: AdaptiveQuestionConfigSchema,
      q3: AdaptiveQuestionConfigSchema,
      q4: AdaptiveQuestionConfigSchema,
      q5: AdaptiveQuestionConfigSchema,
    }),
    businessContext: PrdBusinessContextSchema.optional(),
  }),
  provider: z.enum(['auto', 'gemini', 'openai']).optional(),
});

function summarizeDiscoveryForPrompt(discovery: DiscoveryState): string {
  const formatQ = (id: 'q2' | 'q3' | 'q4' | 'q5') => {
    const q = discovery.questions[id];
    const map = new Map(q.tags.map((t) => [t.id, t.label]));
    const selected = q.selectedTagIds.map((sid) => map.get(sid) ?? sid);
    return `${id.toUpperCase()} (${q.title}): ${selected.join(', ') || '-'}`;
  };

  const biz = discovery.businessContext;
  const bizLines = biz
    ? [
        `Target KPI & Sukses Bisnis: ${biz.successMetrics.trim() || '-'}`,
        `Peran Aktor & Aturan Bisnis: ${biz.userRolesAndRules.trim() || '-'}`,
        `Non-Goals (Out of Scope MVP): ${biz.nonGoals.trim() || '-'}`,
        `Batasan & Spesifikasi Teknis (NFR): ${biz.technicalConstraints.trim() || '-'}`,
      ]
    : [];

  return [
    `Q1 Summary: ${JSON.stringify(discovery.q1Summary)}`,
    `Q1 Chat Stories: ${discovery.q1Messages.filter((m) => m.role === 'user').map((m) => m.content).join(' | ')}`,
    formatQ('q2'),
    formatQ('q3'),
    formatQ('q4'),
    formatQ('q5'),
    ...bizLines,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateWorkspaceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data jawaban 5 pertanyaan belum lengkap.' },
        { status: 400 }
      );
    }

    const discovery = parsed.data.discovery as DiscoveryState;
    const purposeMeta = PRD_PURPOSE_MAP[discovery.prdPurpose ?? 'website'];
    const userApiKey = req.headers.get('x-prdin-api-key');
    const headerProvider =
      (req.headers.get('x-prdin-provider') as AiProviderChoice | null) ?? parsed.data.provider;

    const systemPrompt = `Kamu adalah PRDin Product & UX Systems Architect berbahasa Indonesia.
Tujuan pembuatan PRD saat ini adalah: **${purposeMeta.label}** (${purposeMeta.shortDesc}).
Ubah seluruh jawaban 5 pertanyaan menjadi struktur Workspace PRDin yang sinkron sesuai mode **${purposeMeta.label}**:
1. blueprintNodes dengan zone "ux-research" (4 node: kind "ux-persona", "ux-pain", "ux-value", "ux-retention").
2. blueprintNodes dengan zone "business-flow" — cakup SEMUA tag fitur/artefak yang dipilih user di Q2–Q5 tanpa memangkas pilihan user:
   - Mode "UI / UX Proses": alur tahapan desain & artefak UX/UI dari riset awal -> seluruh artefak pilihan -> usability testing -> handoff;
   - Mode "Aplikasi": onboarding app -> seluruh modul aplikasi pilihan -> state/validasi -> retention loop;
   - Mode "Website": landing entry -> seluruh halaman/fitur web pilihan -> konversi -> kunjungan ulang.
3. edges berarah membentuk Flowchart lengkap antar node (setiap source dan target wajib ada di blueprintNodes.id):
   - Hubungkan seluruh 4 kartu UX Research (ux-persona -> node entry, ux-pain -> node fitur pertama, ux-value -> node flow-decision, ux-retention -> node flow-outcome).
   - Pada flow-decision ("flow-decision"), buat minimal 2 cabang: "Ya · Valid" ke flow-outcome DAN "Tidak · Perlu Revisi" ke node pemulihan/revisi ("flow-recovery") yang kembali ke alur proses ("Ulangi / Perbaiki").
4. planSections yang terhubung 1-to-1 (linkedNodeId dan linkedSectionId cocok) dengan penjelasan lengkap, user story, komponen/artefak UI spesifik (UI/UX-ready), acceptance criteria terukur, dan edge cases.
5. Jika user mengisi businessContext (Target KPI, Peran Aktor & Aturan Bisnis, Non-Goals, atau Batasan Teknis/NFR), wajib tuangkan ke planSections kategori "summary", "specs", dan "non-goals" secara akurat dan terukur.

Keluarkan HANYA JSON sesuai schema.`;

    const userPrompt = `Mode Tujuan PRD: ${purposeMeta.label}\nHasil 5 pertanyaan user:\n${summarizeDiscoveryForPrompt(discovery)}\n\nKembalikan JSON GenerateWorkspaceOutput.`;

    const llmResult = await callStructuredJsonLlm({
      systemPrompt,
      userPrompt,
      schema: GenerateWorkspaceOutputSchema,
      providerChoice: headerProvider,
      userApiKey,
    });

    if (llmResult.ok) {
      const workspace = buildWorkspaceStateFromOutput(discovery, llmResult.data, 'live-llm');
      return NextResponse.json({ workspace });
    }

    const fallbackOutput = buildWorkspaceFallback(discovery);
    const workspace = buildWorkspaceStateFromOutput(discovery, fallbackOutput, 'smart-fallback');
    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json(
      { error: 'Gagal menyusun workspace PRDin.' },
      { status: 500 }
    );
  }
}
