/**
 * Smart Dunning cadence + guardrails (architecture §4.4, RBI FREE-AI principles).
 * Per-school overrides can move to a DunningPolicy table later; constants now.
 */
export const DUNNING = {
  /** Days relative to dueDate when each of the 5 stages fires (stage index 0..4). */
  stageOffsetsDays: [-3, 0, 3, 7, 14],
  /** Stages at/after this 1-based number require owner approval (HITL gate). */
  hitlFromStage: 4,
  /** Quiet hours (IST): no sends 21:00 → 09:00. */
  quietStartHourIST: 21,
  quietEndHourIST: 9,
  /** Frequency caps per run. */
  maxPerDay: 1,
  maxPerWeek: 4,
  /** Inbound keywords that immediately STOP a run and flag a human. */
  stopWords: [
    'stop',
    'lawyer',
    'court',
    'legal',
    'unsubscribe',
    'cancel',
    'band karo',
    'rok do',
    'mat bhejo',
  ],
  istOffsetMinutes: 330, // +05:30
  channel: 'whatsapp',
} as const;

export const TOTAL_STAGES = DUNNING.stageOffsetsDays.length;
