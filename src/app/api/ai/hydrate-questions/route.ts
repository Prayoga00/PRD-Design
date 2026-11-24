import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callStructuredJsonLlm } from '@/lib/ai/provider';
import {
  AdaptiveQuestionConfigSchema,
  HydrateQuestionsLlmOutputSchema,
  HydrateQuestionsRequestSchema,
} from '@/lib/schemas/ai-contracts';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';
import { hydrateQuestionsFromStoryFallback } from '@/lib/engine/smart-fallback';
import type { AdaptiveQuestionConfig, AdaptiveQuestionId, AiProviderChoice } from '@/lib/types/prdin';

const ExtendedRequestSchema = HydrateQuestionsRequestSchema.extend({
  previousQuestions: z
    .object({
      q2: AdaptiveQuestionConfigSchema,
      q3: AdaptiveQuestionConfigSchema,
      q4: AdaptiveQuestionConfigSchema,
      q5: AdaptiveQuestionConfigSchema,
    })
    .optional(),
});

function mergePreservedCustomTags(
  nextQuestions: Record<AdaptiveQuestionId, AdaptiveQuestionConfig>,
  previous?: Record<AdaptiveQuestionId, AdaptiveQuestionConfig>
): Record<AdaptiveQuestionId, AdaptiveQuestionConfig> {
  if (!previous) return nextQuestions;
  const now = Date.now();
  const ids: AdaptiveQuestionId[] = ['q2', 'q3', 'q4', 'q5'];
  const result = { ...nextQuestions };

  for (const id of ids) {
    const customTags = previous[id].tags.filter((t) => t.source === 'user');
    const mergedTags = [...nextQuestions[id].tags, ...customTags];
    const validIds = new Set(mergedTags.map((t) => t.id));
    const keptSelected = previous[id].selectedTagIds
      .filter((sid) => validIds.has(sid))
      .slice(0, nextQuestions[id].maxSelect);
    result[id] = {
      ...nextQuestions[id],
      tags: mergedTags,
      selectedTagIds: keptSelected,
      updatedAt: now,
    };
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExtendedRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Input tidak valid.' },
        { status: 400 }
      );
    }

    const { prdPurpose, story, chatHistory, provider, previousQuestions } = parsed.data;
    const purposeMeta = PRD_PURPOSE_MAP[prdPurpose];
    const userApiKey = req.headers.get('x-prdin-api-key');
    const headerProvider = (req.headers.get('x-prdin-provider') as AiProviderChoice | null) ?? provider;

    const systemPrompt = `Kamu adalah PRDin AI Discovery Architect berbahasa Indonesia yang membantu user awam dan UI/UX designer.
Tujuan pembuatan PRD saat ini adalah: **${purposeMeta.label}** (${purposeMeta.shortDesc}).
Tugasmu membaca cerita di Pertanyaan 1 (siapa 1 orang yang butuh desain/aplikasi/website dan tujuannya untuk apa), lalu menghasilkan JSON terstruktur untuk meng-update Pertanyaan 2, 3, 4, dan 5 secara adaptif sesuai mode **${purposeMeta.label}**.

Aturan wajib:
1. Keluarkan HANYA valid JSON object sesuai schema.
2. Sesuaikan kalimat prompt & tags Q2, Q3, Q4, dan Q5 dengan mode **${purposeMeta.label}** sekaligus domain cerita user:
   - Jika mode "UI / UX Proses": fokus pada riset UX, user journey, IA, wireframe 4 state, prototype usability test, dan handoff Figma.
   - Jika mode "Aplikasi": fokus pada onboarding app, fitur/modul aplikasi, state sistem, dan kebiasaan pemakaian berulang.
   - Jika mode "Website": fokus pada aksi pertama pengunjung, struktur halaman/fitur web, konversi, dan alasan kunjungan ulang.
3. Q2 (stepNumber: 2, selectionMode: "single", minSelect: 1, maxSelect: 1): langkah awal paling krusial.
4. Q3 (stepNumber: 3, selectionMode: "multi", minSelect: 1, maxSelect: 3): 6-7 kandidat fitur/artefak paling relevan agar user memilih maksimal 3 prioritas wajib.
5. Q4 (stepNumber: 4, selectionMode: "multi", minSelect: 1, maxSelect: 2): daya tarik / indikator keberhasilan.
6. Q5 (stepNumber: 5, selectionMode: "multi", minSelect: 1, maxSelect: 2): siklus iterasi / alasan pengguna kembali.
7. Set q1Summary.prdPurpose ke "${prdPurpose}". Setiap tag harus memiliki id unik, label singkat (<= 5 kata), description singkat, dan source: "ai". selectedTagIds harus [].`;

    const historyText = chatHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n');

    const userPrompt = `Mode Tujuan PRD: ${purposeMeta.label} (${prdPurpose})
Riwayat chat Q1:
${historyText}

Cerita terbaru user di Pertanyaan 1:
"${story}"

Kembalikan JSON dengan field:
- assistantReply (ringkas, hangat, konfirmasi bahwa tag Q2-Q5 sudah diperbarui sesuai mode ${purposeMeta.label})
- q1Summary: { prdPurpose: "${prdPurpose}", archetype ("ecommerce"|"booking"|"saas"|"portfolio"|"education"|"internal-tool"|"custom"), productNameSuggestion, persona, coreGoal, painPoint, valueContext }
- questions: { q2, q3, q4, q5 }`;

    const llmResult = await callStructuredJsonLlm({
      systemPrompt,
      userPrompt,
      schema: HydrateQuestionsLlmOutputSchema,
      providerChoice: headerProvider,
      userApiKey,
    });

    if (llmResult.ok) {
      const mergedQuestions = mergePreservedCustomTags(
        llmResult.data.questions as Record<AdaptiveQuestionId, AdaptiveQuestionConfig>,
        previousQuestions as Record<AdaptiveQuestionId, AdaptiveQuestionConfig> | undefined
      );
      return NextResponse.json({
        aiMode: 'live-llm',
        assistantReply: llmResult.data.assistantReply,
        q1Summary: { ...llmResult.data.q1Summary, prdPurpose },
        questions: mergedQuestions,
      });
    }

    const fallback = hydrateQuestionsFromStoryFallback(
      story,
      previousQuestions as Record<AdaptiveQuestionId, AdaptiveQuestionConfig> | undefined,
      prdPurpose
    );
    return NextResponse.json({
      aiMode: 'smart-fallback',
      ...fallback,
    });
  } catch {
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses cerita Pertanyaan 1.' },
      { status: 500 }
    );
  }
}
