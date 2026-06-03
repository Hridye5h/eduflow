import { Injectable, Logger } from '@nestjs/common';
import { LlmAdapter, LlmGenerateOpts } from './llm.port';
import { GeminiAdapter } from './gemini.adapter';
import { SarvamAdapter } from './sarvam.adapter';

/**
 * Model router (architecture §5). Routes by language — Sarvam-M first for
 * Hindi/Hinglish, Gemini Flash first otherwise — and tries the next provider on
 * failure. If nothing is configured (or every call fails), returns
 * `opts.fallback` so callers always get usable text. This is what lets the
 * dunning/grading copy degrade gracefully to deterministic templates.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly gemini = new GeminiAdapter();
  private readonly sarvam = new SarvamAdapter();

  async generate(prompt: string, opts: LlmGenerateOpts = {}): Promise<string> {
    return (await this.generateWithMeta(prompt, opts)).text;
  }

  /**
   * Like generate(), but also reports which model produced the text — or
   * `template-fallback` when nothing was configured / every call failed. Callers
   * that record provenance use this so the ledger names the real model.
   */
  async generateWithMeta(
    prompt: string,
    opts: LlmGenerateOpts = {},
  ): Promise<{ text: string; model: string }> {
    for (const adapter of this.route(opts.language)) {
      if (!adapter.isConfigured()) continue;
      try {
        return { text: await adapter.generate(prompt, opts), model: adapter.name };
      } catch (e) {
        this.logger.warn(`${adapter.name} failed, trying next: ${(e as Error).message}`);
      }
    }
    return { text: opts.fallback ?? '', model: 'template-fallback' };
  }

  anyConfigured(): boolean {
    return this.gemini.isConfigured() || this.sarvam.isConfigured();
  }

  private route(language?: string): LlmAdapter[] {
    return language === 'hi' || language === 'hinglish'
      ? [this.sarvam, this.gemini]
      : [this.gemini, this.sarvam];
  }
}
