import { Injectable, Logger, NotImplementedException } from '@nestjs/common';

/**
 * Handwritten-Devanagari OCR port. Primary adapter is Sarvam Vision (best Hindi
 * doc accuracy); a Gemini-2.5-Pro-vision adapter can slot in for mixed
 * English+math sheets. Low-confidence pages route to faculty HITL review — the
 * deterministic scorer never trusts OCR blindly.
 */
export interface OcrResult {
  text: string;
  /** 0..1 — below the routing threshold, send to a human. */
  confidence: number;
}

export interface OcrPort {
  recognizeDevanagari(image: Buffer): Promise<OcrResult>;
}

export const OCR_PORT = Symbol('OCR_PORT');

/** Sarvam Vision adapter — STUB, inert in production until SARVAM_API_KEY is set. */
@Injectable()
export class SarvamVisionOcr implements OcrPort {
  private readonly logger = new Logger(SarvamVisionOcr.name);

  async recognizeDevanagari(image: Buffer): Promise<OcrResult> {
    const key = process.env.SARVAM_API_KEY;
    const url = process.env.SARVAM_OCR_URL; // exact endpoint set per Sarvam docs
    if (!key || !url) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotImplementedException('Sarvam Vision OCR not configured (SARVAM_API_KEY + SARVAM_OCR_URL)');
      }
      this.logger.warn('Sarvam Vision OCR STUB — not for production');
      return { text: '', confidence: 0 };
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'api-subscription-key': key },
        body: JSON.stringify({ image: image.toString('base64'), language: 'hi' }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`sarvam-vision ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { text?: string; transcript?: string; confidence?: number };
      return { text: json.text ?? json.transcript ?? '', confidence: json.confidence ?? 0.8 };
    } finally {
      clearTimeout(t);
    }
  }
}
