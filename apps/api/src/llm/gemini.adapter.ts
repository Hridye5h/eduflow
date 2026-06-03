import { Injectable, Logger } from '@nestjs/common';
import { LlmAdapter, LlmGenerateOpts } from './llm.port';

/**
 * Gemini 2.5 Flash via the AI Studio generateContent API — the default,
 * cheapest reliable model (architecture §5). Activates when GEMINI_API_KEY is
 * set; otherwise reports unconfigured so the router falls back.
 */
@Injectable()
export class GeminiAdapter implements LlmAdapter {
  readonly name = 'gemini-2.5-flash';
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async generate(prompt: string, opts: LlmGenerateOpts = {}): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');

    // API key goes in the x-goog-api-key header (not the query string): robust to
    // the newer AQ.* key format and keeps the secret out of URLs/proxy logs.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 512,
        // Gemini 2.5 Flash "thinks" by default, and those thinking tokens count
        // against maxOutputTokens — which silently truncates short generations to
        // a few visible tokens. EduFlow's calls (reminders, feedback, OCR cleanup)
        // don't need a scratchpad, so disable it: the full budget goes to the
        // visible answer. (Set a positive budget here if a feature ever needs it.)
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text) throw new Error('gemini returned empty content');
      return text.trim();
    } finally {
      clearTimeout(t);
    }
  }
}
