'use client';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { GradeTrendSparkline } from './GradeTrendSparkline';

/**
 * Subject-level trend lines pulled out of a cumulative report card.
 * Hides when there are fewer than 2 published exams per subject (nothing
 * to trend yet). Renders one row per subject with a tiny sparkline.
 */
export function SubjectTrends({ exams, accent }: { exams: any[]; accent: string }) {
  const trends = useMemo(() => {
    const bySubject = new Map<string, number[]>();
    for (const e of exams ?? []) {
      for (const r of e.rows ?? []) {
        const pct = r.max > 0 ? (r.marks / r.max) * 100 : 0;
        const arr = bySubject.get(r.subject) ?? [];
        arr.push(pct);
        bySubject.set(r.subject, arr);
      }
    }
    return [...bySubject.entries()]
      .filter(([, v]) => v.length >= 2)
      .map(([subject, values]) => ({ subject, values }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [exams]);

  if (trends.length === 0) return null;

  return (
    <Card variant="solid" className="print:hidden">
      <CardHeader
        eyebrow="Trends"
        title="Subject performance over time"
        subtitle="Last few published exams per subject"
      />
      <CardBody className="p-0">
        <ul>
          {trends.map((t) => (
            <li
              key={t.subject}
              className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center justify-between gap-3"
            >
              <span className="font-medium text-sm">{t.subject}</span>
              <GradeTrendSparkline values={t.values} accent={accent} />
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
