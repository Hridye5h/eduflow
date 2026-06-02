import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../theme';

export function Card({ children, style }: ViewProps & { children: React.ReactNode }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.header}>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function Chip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'success' | 'warn' | 'danger' | 'info' | 'brand';
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    default: { bg: theme.surfaceMuted, fg: theme.textMuted },
    success: { bg: theme.successSoft, fg: theme.success },
    warn: { bg: theme.warnSoft, fg: theme.warn },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    info: { bg: theme.infoSoft, fg: theme.info },
    brand: { bg: theme.brandSoft, fg: theme.brand },
  };
  const { bg, fg } = tones[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: { fontSize: 15, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 11, fontWeight: '700' },
});
