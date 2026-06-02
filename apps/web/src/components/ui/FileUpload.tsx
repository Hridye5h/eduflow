'use client';
import { useRef, useState } from 'react';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { session, trackedFetch } from '@/lib/api';

export type Attachment = {
  url: string;
  publicId?: string;
  name: string;
  mime: string;
  size: number;
};

export function FileUpload({
  value,
  onChange,
  multiple = true,
  accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt',
  label,
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const out: Attachment[] = [];
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', f);
        const res = await trackedFetch(
          `${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4001'}/uploads`,
          {
            method: 'POST',
            body: fd,
            headers: {
              Authorization: `Bearer ${session.token()}`,
              ...(session.subdomain() && { 'x-school-subdomain': session.subdomain()! }),
            },
          },
        );
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `Upload failed (${res.status})`);
        }
        const data = await res.json();
        out.push(data);
      }
      onChange(multiple ? [...value, ...out] : out);
      if (ref.current) ref.current.value = '';
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function removeAt(i: number) {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div>
      {label && (
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="ef-btn ef-btn-outline text-sm"
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Attach files'}
        </button>
        <input
          ref={ref}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handle(e.target.files)}
          className="hidden"
        />
        {value.map((a, i) => (
          <span key={i} className="ef-chip">
            <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[14rem]">
              {a.name}
            </a>
            <button type="button" onClick={() => removeAt(i)} className="ml-1 hover:text-[var(--color-danger)]">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {err && <p className="text-xs text-[var(--color-danger)] mt-1">{err}</p>}
    </div>
  );
}
