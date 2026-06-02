import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Card } from '../components/Card';

const QUICK = [
  { key: 'Attendance', label: 'Attendance', icon: 'calendar-outline' as const },
  { key: 'Marks',      label: 'Marks',      icon: 'school-outline' as const },
  { key: 'Assignments',label: 'Homework',   icon: 'document-text-outline' as const },
  { key: 'Timetable',  label: 'Timetable',  icon: 'time-outline' as const },
];

export default function DashboardScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const s = await api('/school/stats', { token: session.token, subdomain: session.subdomain });
      setStats(s);
    } catch {}
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const role = session?.user?.role;
  const present = stats?.todayAttendance?.find((t: any) => t.status === 'PRESENT')?._count._all ?? 0;
  const total = stats?.students ?? 0;
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          tintColor={theme.brand}
        />
      }
    >
      <Text style={s.greeting}>Hi, {session?.user?.name?.split(' ')[0] ?? 'there'}</Text>
      <Text style={s.school}>{session?.subdomain}.eduflow.app · {role?.toLowerCase().replace('_', ' ')}</Text>

      {(role === 'SUPER_ADMIN' || role === 'TEACHER') && (
        <View style={s.statsRow}>
          <Stat label="Students" value={stats?.students ?? '—'} />
          <Stat label="Teachers" value={stats?.teachers ?? '—'} />
          <Stat label="Today att." value={`${pct}%`} tone="brand" />
        </View>
      )}

      <Text style={s.section}>Quick actions</Text>
      <View style={s.grid}>
        {QUICK.map((q) => (
          <Pressable
            key={q.key}
            style={s.quickCard}
            onPress={() => nav.navigate(q.key as never)}
          >
            <View style={s.quickIcon}>
              <Ionicons name={q.icon} size={20} color={theme.brand} />
            </View>
            <Text style={s.quickLabel}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {(role === 'STUDENT' || role === 'PARENT') && (
        <Card style={{ marginTop: 18 }}>
          <View style={{ padding: 16 }}>
            <Text style={s.tipTitle}>Tip</Text>
            <Text style={s.tip}>
              Pull down to refresh. Open Inbox for notifications, Feed for class updates, Chat to message teachers.
            </Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'brand' }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, tone === 'brand' && { color: theme.brand }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  greeting: { fontSize: 24, fontWeight: '700', color: theme.text },
  school: { color: theme.textMuted, marginTop: 4, marginBottom: 18, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: theme.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border },
  statLabel: { fontSize: 11, fontWeight: '700', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 6 },
  section: { fontSize: 12, fontWeight: '700', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    flexBasis: '48%', flexGrow: 1,
    backgroundColor: theme.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 14, fontWeight: '600', color: theme.text },
  tipTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
  tip: { fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 19 },
});
