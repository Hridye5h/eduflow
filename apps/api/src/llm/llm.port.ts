export interface LlmGenerateOpts {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Hint for routing: 'hi'/'hinglish' prefers Sarvam-M; else Gemini Flash. */
  language?: 'en' | 'hi' | 'hinglish';
  /** Returned verbatim if no provider is configured or the call fails. */
  fallback?: string;
  /** Abort the HTTP call after this many ms. */
  timeoutMs?: number;
}

export interface LlmAdapter {
  readonly name: string;
  isConfigured(): boolean;
  generate(prompt: string, opts?: LlmGenerateOpts): Promise<string>;
}
