import { z } from 'zod';
import type { AiProviderChoice } from '@/lib/types/prdin';

interface LlmCallOptions<T extends z.ZodTypeAny> {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  providerChoice?: AiProviderChoice;
  userApiKey?: string | null;
}

type LlmCallResult<T> =
  | { ok: true; data: T; provider: 'gemini' | 'openai' }
  | { ok: false; reason: 'no-key' | 'error' };

function resolveCredentials(
  providerChoice: AiProviderChoice = 'auto',
  userApiKey?: string | null
): { provider: 'gemini' | 'openai'; apiKey: string } | null {
  const cleanedUserKey = userApiKey?.trim() || '';

  if (cleanedUserKey) {
    if (providerChoice === 'openai') {
      return { provider: 'openai', apiKey: cleanedUserKey };
    }
    if (providerChoice === 'gemini') {
      return { provider: 'gemini', apiKey: cleanedUserKey };
    }
    if (cleanedUserKey.startsWith('sk-')) {
      return { provider: 'openai', apiKey: cleanedUserKey };
    }
    return { provider: 'gemini', apiKey: cleanedUserKey };
  }

  const envGemini = process.env.GEMINI_API_KEY?.trim();
  const envOpenAi = process.env.OPENAI_API_KEY?.trim();

  if (providerChoice === 'openai' && envOpenAi) {
    return { provider: 'openai', apiKey: envOpenAi };
  }
  if (providerChoice === 'gemini' && envGemini) {
    return { provider: 'gemini', apiKey: envGemini };
  }
  if (envGemini) return { provider: 'gemini', apiKey: envGemini };
  if (envOpenAi) return { provider: 'openai', apiKey: envOpenAi };

  return null;
}

function extractJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(22000),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini request failed with status ${res.status}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty Gemini response');
  }
  return text;
}

async function callOpenAi(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
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

  if (!res.ok) {
    throw new Error(`OpenAI request failed with status ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty OpenAI response');
  }
  return text;
}

export async function callStructuredJsonLlm<T extends z.ZodTypeAny>(
  options: LlmCallOptions<T>
): Promise<LlmCallResult<z.infer<T>>> {
  const creds = resolveCredentials(options.providerChoice, options.userApiKey);
  if (!creds) {
    return { ok: false, reason: 'no-key' };
  }

  try {
    const raw =
      creds.provider === 'gemini'
        ? await callGemini(creds.apiKey, options.systemPrompt, options.userPrompt)
        : await callOpenAi(creds.apiKey, options.systemPrompt, options.userPrompt);

    const parsed = extractJsonObject(raw);
    const validated = options.schema.safeParse(parsed);
    if (!validated.success) {
      return { ok: false, reason: 'error' };
    }
    return { ok: true, data: validated.data, provider: creds.provider };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
