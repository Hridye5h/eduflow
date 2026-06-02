import { scoreSheet } from './scoring';

/**
 * The hard CI gate: scores are deterministic. No DB, always runs. If any of
 * these change unexpectedly, a scoring bug is shipping — block the merge.
 */
describe('scoreSheet (deterministic — the no-hallucinated-score gate)', () => {
  it('computes exact totals, percentage, per-topic aggregation, and weak topics', () => {
    const s = scoreSheet([
      { topic: 'Algebra', awarded: 8, max: 10 },
      { topic: 'Algebra', awarded: 2, max: 10 },
      { topic: 'Geometry', awarded: 3, max: 10 },
    ]);
    expect(s.totalAwarded).toBe(13);
    expect(s.totalMax).toBe(30);
    expect(s.percentage).toBe(43.33);
    expect(s.perTopic).toEqual([
      { topic: 'Algebra', awarded: 10, max: 20, percentage: 50 },
      { topic: 'Geometry', awarded: 3, max: 10, percentage: 30 },
    ]);
    expect(s.weakTopics).toEqual(['Geometry']); // 50% is NOT weak; 30% is
  });

  it('is pure — identical input yields identical output', () => {
    const items = [{ topic: 'X', awarded: 1, max: 3 }];
    expect(scoreSheet(items)).toEqual(scoreSheet(items));
  });

  it('rejects empty and out-of-range input instead of guessing', () => {
    expect(() => scoreSheet([])).toThrow();
    expect(() => scoreSheet([{ topic: 'X', awarded: 11, max: 10 }])).toThrow();
    expect(() => scoreSheet([{ topic: 'X', awarded: -1, max: 10 }])).toThrow();
    expect(() => scoreSheet([{ topic: 'X', awarded: 1, max: 0 }])).toThrow();
  });
});
