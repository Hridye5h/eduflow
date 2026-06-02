import { Injectable, Logger } from '@nestjs/common';
import { LlmAdapter, LlmGenerateOpts } from './llm.port';

/**
 * Sarvam-M via the OpenAI-compatible chat API — best native Hinglish /
 * romanized-Hindi register for parent-facing copy (architecture §5). Activates
 * when SARVAM_API_KEY is set.
 */
@Injectable()
export class SarvamAdapter implements LlmAdapter {
  readonly name = 'sarvam-m';
  private readonly logger = new Logger(SarvamAdapter.name);
  private readonly model = process.env.SARVAM_MODEL || 'sarvam-m';

  isConfigured(): boolean {
    return !!process.env.SARVAM_API_KEY;
  }

  async generate(prompt: string, opts: LlmGenerateOpts = {}): Promise<string> {
    const key = process.env.SARVAM_API_KEY;
    if (!key) throw new Error('SARVAM_API_KEY not set');

    const messages = [
      ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
      { role: 'user', content: prompt },
    ];
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    try {
      const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'api-subscription-key': key },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 512,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`sarvam ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('sarvam returned empty content');
      return text.trim();
    } finally {
      clearTimeout(t);
    }
  }
}
