import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const MENU = [
  { label: 'Attendance',  screen: 'Attendance',  icon: 'calendar-outline' as const },
  { label: 'Marks',       screen: 'Marks',       icon: 'school-outline' as const },
  { label: 'Report card', screen: 'ReportCard',  icon: 'document-outline' as const },
  { label: 'Assignments', screen: 'Assignments', icon: 'document-text-outline' as const },
  { label: 'Timetable',   screen: 'Timetable',   icon: 'time-outline' as const },
];

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const nav = useNavigation<any>();
  const user = session?.user;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{(user?.name || '?').slice(0, 1).toUpperCase()}</Text></View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email || user?.phone}</Text>
        <Text style={s.role}>{(user?.role || '').toLowerCase().replace('_', ' ')} · {session?.subdomain}</Text>
      </View>

      <View style={s.menu}>
        {MENU.map((m) => (
          <Pressable key={m.screen} style={s.menuItem} onPress={() => nav.navigate(m.screen)}>
            <Ionicons name={m.icon} size={20} color={theme.textMuted} />
            <Text style={s.menuText}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
          </Pressable>
        ))}
      </View>

      <Pressable style={s.signOut} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  header: { alignItems: 'center', padding: 24, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.brand, fontSize: 28, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 10 },
  email: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  role: { fontSize: 12, color: theme.textSubtle, marginTop: 6, textTransform: 'capitalize' },
  menu: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  menuText: { fontSize: 14, color: theme.text, flex: 1 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 16, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  signOutText: { color: theme.danger, fontWeight: '600' },
});
