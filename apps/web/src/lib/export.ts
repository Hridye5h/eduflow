/**
 * Tiny client-side CSV exporter.
 * Adds a UTF-8 BOM so Excel opens diacritics cleanly.
 */
export function downloadCsv(filename: string, rows: Array<Record<string, any>>) {
  if (!rows || rows.length === 0) {
    if (typeof window !== 'undefined') alert('Nothing to export.');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')),
  ];
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v: any): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Convenience: build a filename like `attendance-2026-05-14.csv` */
export function dateStamp(prefix: string, d = new Date()) {
  const iso = d.toISOString().slice(0, 10);
  return `${prefix}-${iso}.csv`;
}
