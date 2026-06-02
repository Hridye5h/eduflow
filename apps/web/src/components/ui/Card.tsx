import * as React from 'react';

export function Card({
  children,
  className = '',
  variant = 'glass',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'solid';
}) {
  const base = variant === 'solid' ? 'ef-card-strong' : 'ef-card';
  return <div className={`${base} ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  right,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
      <div className="min-w-0">
        {eyebrow && <div className="ef-eyebrow mb-1.5">{eyebrow}</div>}
        <h3 className="text-base font-semibold text-[var(--color-text)] leading-tight">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warn' | 'danger' | 'info' | 'brand';
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-[var(--color-text)]',
    success: 'text-[var(--color-success)]',
    warn:    'text-[var(--color-warn)]',
    danger:  'text-[var(--color-danger)]',
    info:    'text-[var(--color-info)]',
    brand:   'text-[var(--color-brand)]',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
      <div className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${toneClasses[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</div>}
    </Card>
  );
}
