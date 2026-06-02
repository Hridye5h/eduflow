/**
 * Deterministic test scoring — the defensible core of AI Test & Grading.
 *
 * Scores are PURE COMPUTE: no LLM ever decides a mark. The model only phrases the
 * narrative around these numbers (in GradingService). This module has zero
 * dependencies and is unit-tested for exact equality, so a wrong score is a code
 * bug we catch in CI, never a hallucination.
 */
export interface ScoreItem {
  topic: string;
  awarded: number;
  max: number;
}

export interface TopicScore {
  topic: string;
  awarded: number;
  max: number;
  percentage: number;
}

export interface SheetScore {
  totalAwarded: number;
  totalMax: number;
  percentage: number;
  perTopic: TopicScore[];
  weakTopics: string[];
}

/** A topic below this percentage is flagged "weak". */
export const WEAK_THRESHOLD = 50;

export function scoreSheet(items: ScoreItem[]): SheetScore {
  if (items.length === 0) throw new Error('cannot score an empty sheet');
  for (const it of items) {
    if (!(it.max > 0)) throw new Error(`max must be > 0 for topic "${it.topic}"`);
    if (it.awarded < 0 || it.awarded > it.max) {
      throw new Error(`awarded ${it.awarded} out of range [0, ${it.max}] for "${it.topic}"`);
    }
  }

  // Aggregate questions sharing a topic (deterministic order preserved).
  const order: string[] = [];
  const byTopic = new Map<string, { awarded: number; max: number }>();
  for (const it of items) {
    if (!byTopic.has(it.topic)) order.push(it.topic);
    const cur = byTopic.get(it.topic) ?? { awarded: 0, max: 0 };
    cur.awarded += it.awarded;
    cur.max += it.max;
    byTopic.set(it.topic, cur);
  }

  const perTopic: TopicScore[] = order.map((topic) => {
    const v = byTopic.get(topic)!;
    return { topic, awarded: v.awarded, max: v.max, percentage: pct(v.awarded, v.max) };
  });

  const totalAwarded = items.reduce((s, it) => s + it.awarded, 0);
  const totalMax = items.reduce((s, it) => s + it.max, 0);

  return {
    totalAwarded,
    totalMax,
    percentage: pct(totalAwarded, totalMax),
    perTopic,
    weakTopics: perTopic.filter((t) => t.percentage < WEAK_THRESHOLD).map((t) => t.topic),
  };
}

/** Percentage rounded to 2 dp — stable across runs. */
function pct(awarded: number, max: number): number {
  return Math.round((awarded / max) * 10000) / 100;
}
