import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Chip } from '../components/Card';

type Report = {
  student: { name: string; rollNumber: string | null; section: any };
  exams: Array<{
    exam: { id: string; name: string; type: string; maxMarks: number };
    rows: Array<{ subject: string; marks: number; max: number; grade: string | null }>;
    total: number; max: number; percentage: number;
  }>;
  cumulative: { total: number; max: number; percentage: number } | null;
};

export default function ReportCardScreen() {
  const { session } = useAuth();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!session) return;
    // For students/parents pilot — use logged-in user's id (admin testing can replace)
    api<Report>(`/students/${session.user.id}/report-card`, {
      token: session.token, subdomain: session.subdomain,
    }).then(setReport).catch(() => {});
  }, [session]);

  if (!report) {
    return <View style={{ padding: 20 }}><Text style={{ color: theme.textMuted }}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={s.headerCard}>
        <Text style={s.name}>{report.student.name}</Text>
        <Text style={s.sub}>
          {report.student.section?.class?.label} · Section {report.student.section?.name} · Roll {report.student.rollNumber || '—'}
        </Text>
        {report.cumulative && (
          <View style={s.cumRow}>
            <View style={s.cumItem}>
              <Text style={s.cumLabel}>Cumulative</Text>
              <Text style={s.cumValue}>{report.cumulative.total}/{report.cumulative.max}</Text>
            </View>
            <View style={s.cumItem}>
              <Text style={s.cumLabel}>Overall %</Text>
              <Text style={[s.cumValue, { color: theme.brand }]}>{report.cumulative.percentage}%</Text>
            </View>
          </View>
        )}
      </View>

      {report.exams.length === 0 ? (
        <View style={s.empty}><Text style={{ color: theme.textMuted }}>No published marks yet.</Text></View>
      ) : (
        report.exams.map((e) => (
          <View key={e.exam.id} style={s.examCard}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.examName}>{e.exam.name}</Text>
                <Text style={s.examType}>{e.exam.type.replace('_', ' ')}</Text>
              </View>
              <Text style={s.examTotal}>{e.total}/{e.max} · {e.percentage}%</Text>
            </View>
            {e.rows.map((r, i) => (
              <View key={i} style={s.markRow}>
                <Text style={s.subject}>{r.subject}</Text>
                <Text style={s.marks}>{r.marks}/{r.max}</Text>
                {r.grade && <Chip label={r.grade} tone="default" />}
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  headerCard: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 16, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700', color: theme.text },
  sub: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  cumRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cumItem: { flex: 1, backgroundColor: theme.bg, borderRadius: 10, padding: 12, alignItems: 'center' },
  cumLabel: { fontSize: 11, color: theme.textSubtle, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  cumValue: { fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 2 },
  examCard: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10 },
  examName: { fontSize: 15, fontWeight: '700', color: theme.text },
  examType: { fontSize: 11, color: theme.textSubtle, textTransform: 'uppercase', marginTop: 2 },
  examTotal: { fontSize: 13, fontWeight: '700', color: theme.text },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
  subject: { flex: 1, color: theme.text, fontSize: 14 },
  marks: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  empty: { padding: 20, alignItems: 'center' },
});
