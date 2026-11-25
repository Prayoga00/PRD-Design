import type {
  AdaptiveQuestionConfig,
  AdaptiveQuestionId,
  AiSettings,
  DiscoveryState,
  FlowchartDirection,
  PrdPurpose,
  WorkspacePatch,
  WorkspaceState,
} from '@/lib/types/prdin';
import {
  applyFallbackChatCommand,
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
  hydrateQuestionsFromStoryFallback,
} from '@/lib/engine/smart-fallback';
import {
  GenerateWorkspaceOutputSchema,
  HydrateQuestionsLlmOutputSchema,
  WorkspaceChatOutputSchema,
} from '@/lib/schemas/ai-contracts';
import { PRD_PURPOSE_MAP } from '@/lib/constants/prd-purposes';

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

function buildHeaders(aiSettings: AiSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-prdin-provider': aiSettings.provider,
  };
  if (aiSettings.apiKey.trim()) {
    headers['x-prdin-api-key'] = aiSettings.apiKey.trim();
  }
  return headers;
}

function parseJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1].trim() : trimmed);
}

async function callBrowserByokLlm(
  aiSettings: AiSettings,
  systemPrompt: string,
  userPrompt: string
): Promise<unknown | null> {
  const apiKey = aiSettings.apiKey.trim();
  if (!apiKey) return null;

  const provider =
    aiSettings.provider === 'openai' ||
    (aiSettings.provider === 'auto' && apiKey.startsWith('sk-'))
      ? 'openai'
      : 'gemini';

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(22000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? parseJsonObject(text) : null;
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content;
    return text ? parseJsonObject(text) : null;
  } catch {
    return null;
  }
}

export async function hydrateQuestionsClient(input: {
  prdPurpose: PrdPurpose;
  story: string;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
  previousQuestions: Record<AdaptiveQuestionId, AdaptiveQuestionConfig>;
  aiSettings: AiSettings;
}) {
  if (!isStaticExport) {
    try {
      const res = await fetch('/api/ai/hydrate-questions', {
        method: 'POST',
        headers: buildHeaders(input.aiSettings),
        body: JSON.stringify({
          prdPurpose: input.prdPurpose,
          story: input.story,
          chatHistory: input.chatHistory,
          provider: input.aiSettings.provider,
          previousQuestions: input.previousQuestions,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status !== 404 && res.status !== 405) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? 'Gagal memperbarui pertanyaan.');
      }
    } catch (err) {
      if (err instanceof Error && !/fetch|network/i.test(err.message)) {
        throw err;
      }
    }
  }

  // Static export / GitHub Pages mode: try BYOK LLM in browser, then Smart Engine
  const purposeMeta = PRD_PURPOSE_MAP[input.prdPurpose];
  const byokRaw = await callBrowserByokLlm(
    input.aiSettings,
    `Kamu adalah PRDin AI Discovery Architect berbahasa Indonesia.
Mode Tujuan PRD: **${purposeMeta.label}** (${purposeMeta.shortDesc}).
Tugasmu menganalisa cerita Pertanyaan 1 secara mendalam lalu menghasilkan JSON:
1. assistantReply: konfirmasi ringkas & jelas mengenai persona, masalah utama, dan tujuan yang terdeteksi.
2. q1Summary: { prdPurpose: "${input.prdPurpose}", archetype, productNameSuggestion, persona, coreGoal, painPoint, valueContext } — ekstrak langsung dari cerita Q1, bukan kalimat generik.
3. questions: { q2, q3, q4, q5 } — setiap pertanyaan wajib memakai selectionMode: "unlimited", minSelect: 1, maxSelect: null agar pengguna bebas memilih sebanyak apa pun tag (6–8 tag relevan per pertanyaan, selectedTagIds: []).
Keluarkan HANYA valid JSON object.`,
    `Mode Tujuan: ${purposeMeta.label}\nRiwayat Q1: ${JSON.stringify(input.chatHistory)}\nCerita Q1 terbaru: "${input.story}"`
  );
  if (byokRaw) {
    const validated = HydrateQuestionsLlmOutputSchema.safeParse(byokRaw);
    if (validated.success) {
      const normalizedQuestions = {
        q2: { ...validated.data.questions.q2, selectionMode: 'unlimited' as const, maxSelect: null },
        q3: { ...validated.data.questions.q3, selectionMode: 'unlimited' as const, maxSelect: null },
        q4: { ...validated.data.questions.q4, selectionMode: 'unlimited' as const, maxSelect: null },
        q5: { ...validated.data.questions.q5, selectionMode: 'unlimited' as const, maxSelect: null },
      };
      return {
        aiMode: 'live-llm',
        assistantReply: validated.data.assistantReply,
        q1Summary: { ...validated.data.q1Summary, prdPurpose: input.prdPurpose },
        questions: normalizedQuestions,
      };
    }
  }

  return {
    aiMode: 'smart-fallback',
    ...hydrateQuestionsFromStoryFallback(
      input.story,
      input.previousQuestions,
      input.prdPurpose
    ),
  };
}

export async function generateWorkspaceClient(input: {
  discovery: DiscoveryState;
  aiSettings: AiSettings;
  flowchartDirection?: FlowchartDirection;
}): Promise<{ workspace: WorkspaceState }> {
  const direction: FlowchartDirection = input.flowchartDirection ?? 'TB';
  if (!isStaticExport) {
    try {
      const res = await fetch('/api/ai/generate-workspace', {
        method: 'POST',
        headers: buildHeaders(input.aiSettings),
        body: JSON.stringify({
          discovery: input.discovery,
          provider: input.aiSettings.provider,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          const ws = data.workspace as WorkspaceState;
          return {
            workspace: {
              ...ws,
              flowchartDirection: ws.flowchartDirection ?? direction,
            },
          };
        }
      } else if (res.status !== 404 && res.status !== 405) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? 'Gagal membuat workspace.');
      }
    } catch (err) {
      if (err instanceof Error && !/fetch|network/i.test(err.message)) {
        throw err;
      }
    }
  }

  const purposeMeta = PRD_PURPOSE_MAP[input.discovery.prdPurpose ?? 'website'];
  const byokRaw = await callBrowserByokLlm(
    input.aiSettings,
    `Kamu adalah PRDin Product & UX Systems Architect berbahasa Indonesia. Mode: ${purposeMeta.label}. Susun blueprintNodes (zone ux-research 4 node + zone business-flow lengkap) dan edges membentuk Flowchart lengkap: hubungkan 4 UX node ke tahapan relevan, serta buat cabang Decision ("Ya · Valid" ke outcome dan "Tidak · Perlu Revisi" ke node flow-recovery yang kembali ke alur proses). Jika discovery.businessContext terisi, integrasikan ke planSections kategori "summary", "specs", dan "non-goals". Keluarkan HANYA valid JSON GenerateWorkspaceOutput.`,
    `Discovery: ${JSON.stringify(input.discovery)}`
  );
  if (byokRaw) {
    const validated = GenerateWorkspaceOutputSchema.safeParse(byokRaw);
    if (validated.success) {
      return {
        workspace: buildWorkspaceStateFromOutput(
          input.discovery,
          validated.data,
          'live-llm',
          direction
        ),
      };
    }
  }

  const fallbackOutput = buildWorkspaceFallback(input.discovery);
  return {
    workspace: buildWorkspaceStateFromOutput(
      input.discovery,
      fallbackOutput,
      'smart-fallback',
      direction
    ),
  };
}

export async function sendWorkspaceChatClient(input: {
  message: string;
  workspace: WorkspaceState;
  aiSettings: AiSettings;
}): Promise<{
  aiMode: 'live-llm' | 'smart-fallback';
  assistantMessage: string;
  patch: WorkspacePatch;
}> {
  if (!isStaticExport) {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: buildHeaders(input.aiSettings),
        body: JSON.stringify({
          message: input.message,
          workspace: input.workspace,
          provider: input.aiSettings.provider,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status !== 404 && res.status !== 405) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? 'Gagal memproses instruksi chat.');
      }
    } catch (err) {
      if (err instanceof Error && !/fetch|network/i.test(err.message)) {
        throw err;
      }
    }
  }

  const byokRaw = await callBrowserByokLlm(
    input.aiSettings,
    'Kamu adalah Chat AI Co-Pilot PRDin berbahasa Indonesia. Keluarkan JSON { assistantMessage, patch }.',
    `Proyek: ${input.workspace.projectTitle}\nInstruksi user: "${input.message}"`
  );
  if (byokRaw) {
    const validated = WorkspaceChatOutputSchema.safeParse(byokRaw);
    if (validated.success) {
      return {
        aiMode: 'live-llm',
        assistantMessage: validated.data.assistantMessage,
        patch: validated.data.patch,
      };
    }
  }

  return {
    aiMode: 'smart-fallback',
    ...applyFallbackChatCommand(input.message, input.workspace),
  };
}
