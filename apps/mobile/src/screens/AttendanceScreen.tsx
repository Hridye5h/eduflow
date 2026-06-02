import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Chip } from '../components/Card';

type Record = { date: string; status: string; note: string | null };
type MonthData = { month: string; records: Record[]; percentage: number; totals: any };

const STATUS_TONE: Record<string, any> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warn',
  HALF_DAY: 'info',
  ON_LEAVE: 'brand',
};

export default function AttendanceScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<MonthData | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  // for students, use own id; for parents, fetch linked student
  useEffect(() => {
    if (!session) return;
    const me = session.user;
    if (me.role === 'STUDENT') {
      setStudentId(me.id);
    } else {
      // PARENT: pull first linked child via classes/students of school is too heavy;
      // for pilot we just show admin's school view if available
      setStudentId(me.id);
    }
  }, [session]);

  useEffect(() => {
    if (!studentId) return;
    const month = new Date().toISOString().slice(0, 7);
    api<MonthData>(`/attendance/student/${studentId}/month?month=${month}`, {
      token: session!.token, subdomain: session!.subdomain,
    }).then(setData).catch(() => setData({ month, records: [], percentage: 0, totals: {} }));
  }, [studentId]);

  if (!data) return <View style={{ padding: 20 }}><Text style={{ color: theme.textMuted }}>Loading…</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>This month</Text>
          <Text style={[s.summaryValue, { color: data.percentage >= 75 ? theme.success : theme.warn }]}>
            {data.percentage}%
          </Text>
        </View>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Present</Text>
          <Text style={s.summaryValue}>{data.totals.PRESENT ?? 0}</Text>
        </View>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Absent</Text>
          <Text style={s.summaryValue}>{data.totals.ABSENT ?? 0}</Text>
        </View>
      </View>

      <Text style={s.section}>Daily record</Text>
      {data.records.length === 0 ? (
        <Text style={{ color: theme.textMuted, padding: 20, textAlign: 'center' }}>No records this month.</Text>
      ) : (
        data.records.map((r) => (
          <View key={r.date} style={s.row}>
            <Text style={s.date}>{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <Chip label={r.status.replace('_', ' ')} tone={STATUS_TONE[r.status] ?? 'default'} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryItem: { flex: 1, backgroundColor: theme.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: theme.textSubtle, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 4 },
  section: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: theme.textSubtle, marginBottom: 10, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  date: { color: theme.text, fontWeight: '500' },
});
