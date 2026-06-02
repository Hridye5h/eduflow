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

  async recognizeDevanagari(_image: Buffer): Promise<OcrResult> {
    const configured = !!process.env.SARVAM_API_KEY;
    if (!configured) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotImplementedException('Sarvam Vision OCR not configured');
      }
      this.logger.warn('Sarvam Vision OCR STUB — not for production');
      return { text: '', confidence: 0 };
    }
    // TODO: POST image to Sarvam Vision; return transcript + confidence.
    throw new NotImplementedException('Sarvam Vision OCR not yet implemented');
  }
}
