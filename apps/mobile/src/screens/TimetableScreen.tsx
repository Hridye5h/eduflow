import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimetableScreen() {
  const { session } = useAuth();
  const [tt, setTt] = useState<any>(null);

  useEffect(() => {
    if (!session) return;
    const user = session.user;
    if (user.role === 'STUDENT') {
      api(`/timetable/student/${user.id}`, { token: session.token, subdomain: session.subdomain })
        .then(setTt).catch(() => {});
    }
  }, [session]);

  if (!tt) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: theme.textMuted }}>
          {session?.user?.role === 'STUDENT' ? 'Loading…' : 'Timetable view is per-student. Sign in as a student.'}
        </Text>
      </View>
    );
  }

  const periods = tt.timetable.periods as Array<{
    dayOfWeek: number; periodIndex: number; startTime: string; endTime: string; subject: { name: string } | null;
  }>;
  const byDay: Record<number, typeof periods> = {};
  for (const p of periods) {
    (byDay[p.dayOfWeek] = byDay[p.dayOfWeek] || []).push(p);
  }
  for (const arr of Object.values(byDay)) arr.sort((a, b) => a.periodIndex - b.periodIndex);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      {DAYS.map((label, d) => (
        <View key={d} style={s.dayCard}>
          <Text style={s.dayTitle}>{label}</Text>
          {(byDay[d] ?? []).length === 0 ? (
            <Text style={s.empty}>No classes</Text>
          ) : (
            (byDay[d] ?? []).map((p, i) => (
              <View key={i} style={s.period}>
                <Text style={s.time}>{p.startTime}–{p.endTime}</Text>
                <Text style={s.subject}>{p.subject?.name ?? '—'}</Text>
              </View>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dayCard: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10 },
  dayTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 },
  empty: { fontSize: 13, color: theme.textSubtle, fontStyle: 'italic' },
  period: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  time: { fontSize: 13, color: theme.textMuted, fontVariant: ['tabular-nums'] },
  subject: { fontSize: 13, fontWeight: '600', color: theme.text },
});
