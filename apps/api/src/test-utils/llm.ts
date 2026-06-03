import { LlmService } from '../llm/llm.service';

/**
 * Deterministic, OFFLINE LlmService for unit/integration specs. It always
 * returns the caller's `fallback` (the deterministic template) and reports the
 * `template-fallback` model — so the default test suite never depends on a live
 * provider, an API key, or the network. The real Gemini/Sarvam path is exercised
 * only by the opt-in `*.live-demo.spec.ts` files (gated on the key being set).
 */
export function fakeLlm(): LlmService {
  return {
    generate: async (_prompt: string, opts?: { fallback?: string }) => opts?.fallback ?? '',
    generateWithMeta: async (_prompt: string, opts?: { fallback?: string }) => ({
      text: opts?.fallback ?? '',
      model: 'template-fallback',
    }),
    anyConfigured: () => false,
  } as unknown as LlmService;
}
