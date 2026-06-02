import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const r = await api<Notif[]>('/notifications', { token: session.token, subdomain: session.subdomain });
      setItems(r);
    } catch {}
  }, [session]);

  useEffect(() => { load(); }, [load]);

  async function readOne(id: string) {
    await api(`/notifications/${id}/read`, {
      method: 'PATCH', token: session!.token, subdomain: session!.subdomain,
    });
    await load();
  }
  async function readAll() {
    await api(`/notifications/read-all`, {
      method: 'POST', token: session!.token, subdomain: session!.subdomain,
    });
    await load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Inbox</Text>
        <Pressable onPress={readAll} style={s.headerBtn}>
          <Ionicons name="checkmark-done" size={16} color={theme.brand} />
          <Text style={s.headerBtnText}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={theme.brand}
          />
        }
        ItemSeparatorComponent={() => <View style={s.divider} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Ionicons name="notifications-outline" size={32} color={theme.textSubtle} />
            <Text style={{ marginTop: 8, color: theme.textMuted }}>Nothing here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => !item.readAt && readOne(item.id)}
            style={[s.row, !item.readAt && s.unread]}
          >
            <View style={[s.dot, !item.readAt && s.dotActive]} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={s.type}>{item.type.replace(/_/g, ' ')}</Text>
                <Text style={s.ts}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.body}>{item.body}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.text, flex: 1 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtnText: { color: theme.brand, fontWeight: '600', fontSize: 13 },
  divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 16 },
  row: { flexDirection: 'row', gap: 10, padding: 16, alignItems: 'flex-start' },
  unread: { backgroundColor: theme.brandSoft + '50' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotActive: { backgroundColor: theme.brand },
  type: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textSubtle, backgroundColor: theme.surfaceMuted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ts: { fontSize: 11, color: theme.textSubtle },
  title: { fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 4 },
  body: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
});
