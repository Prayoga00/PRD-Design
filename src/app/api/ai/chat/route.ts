import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callStructuredJsonLlm } from '@/lib/ai/provider';
import { WorkspaceChatOutputSchema } from '@/lib/schemas/ai-contracts';
import { applyFallbackChatCommand } from '@/lib/engine/smart-fallback';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import type { AiProviderChoice, WorkspaceState } from '@/lib/types/prdin';

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong.'),
  workspace: z.object({
    projectId: z.string(),
    projectTitle: z.string(),
    aiMode: z.enum(['live-llm', 'smart-fallback']),
    discovery: z.any(),
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    planSections: z.array(z.any()),
    chatMessages: z.array(z.any()),
    selectedNodeId: z.string().nullable(),
  }),
  provider: z.enum(['auto', 'gemini', 'openai']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Pesan chat tidak valid.' },
        { status: 400 }
      );
    }

    const { message } = parsed.data;
    const workspace = parsed.data.workspace as WorkspaceState;
    const prdPurpose = workspace.discovery?.prdPurpose ?? 'website';
    const purposeLabel = PRD_PURPOSE_MAP[prdPurpose].label;
    const userApiKey = req.headers.get('x-prdin-api-key');
    const headerProvider =
      (req.headers.get('x-prdin-provider') as AiProviderChoice | null) ?? parsed.data.provider;

    const compactNodes = workspace.nodes.map((n) => ({
      id: n.id,
      title: n.data.title,
      zone: n.data.zone,
      kind: n.data.kind,
      linkedSectionId: n.data.linkedSectionId,
    }));
    const compactSections = workspace.planSections.map((s) => ({
      id: s.id,
      category: s.category,
      title: s.title,
      linkedNodeId: s.linkedNodeId,
    }));

    const systemPrompt = `Kamu adalah Chat AI Co-Pilot di panel kanan PRDin.
Mode Tujuan PRD proyek ini: **${purposeLabel}**.
Tugasmu merespons permintaan user dalam Bahasa Indonesia yang jelas AND mengeluarkan JSON patch untuk memperbarui Canvas Tengah (nodes/edges) dan Plan Text Kiri (planSections) bila diminta mengubah atau menambah sesuatu agar tetap selaras dengan mode **${purposeLabel}**.

Aturan:
1. Keluarkan HANYA valid JSON: { "assistantMessage": string, "patch": { projectTitle?, upsertNodes?, removeNodeIds?, upsertEdges?, removeEdgeIds?, upsertPlanSections? } }.
2. Jika menambah node baru di patch.upsertNodes, set connectFromNodeId ke salah satu node yang sudah ada jika relevan, dan sertakan juga section padanannya di patch.upsertPlanSections dengan linkedNodeId yang cocok.
3. Jika user hanya bertanya atau berdiskusi tanpa meminta perubahan struktur, biarkan patch: {}.`;

    const userPrompt = `Proyek: ${workspace.projectTitle}
Node terpilih saat ini: ${workspace.selectedNodeId ?? 'tidak ada'}
Daftar Node Canvas: ${JSON.stringify(compactNodes)}
Daftar Edges: ${JSON.stringify(workspace.edges)}
Daftar Plan Sections: ${JSON.stringify(compactSections)}

Instruksi user: "${message}"`;

    const llmResult = await callStructuredJsonLlm({
      systemPrompt,
      userPrompt,
      schema: WorkspaceChatOutputSchema,
      providerChoice: headerProvider,
      userApiKey,
    });

    if (llmResult.ok) {
      return NextResponse.json({
        aiMode: 'live-llm',
        assistantMessage: llmResult.data.assistantMessage,
        patch: llmResult.data.patch,
      });
    }

    const fallback = applyFallbackChatCommand(message, workspace);
    return NextResponse.json({
      aiMode: 'smart-fallback',
      ...fallback,
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memproses pesan Chat AI.' },
      { status: 500 }
    );
  }
}
