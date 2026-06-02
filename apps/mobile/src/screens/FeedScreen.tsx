import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Chip } from '../components/Card';

type Post = {
  id: string;
  type: string;
  scope: 'CLASS' | 'SCHOOL';
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  attachmentsJson: { url: string; name: string }[] | null;
  author: { name: string; role: string };
  _count: { comments: number; reactions: number };
};

const TYPE_TONE: Record<string, any> = {
  ANNOUNCEMENT: 'info',
  HOMEWORK: 'brand',
  NOTICE: 'warn',
  EVENT: 'success',
  TEST_REMINDER: 'warn',
  ASSIGNMENT: 'brand',
};

export default function FeedScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const list = await api<Post[]>('/feed', { token: session.token, subdomain: session.subdomain });
      setItems(list);
    } catch {}
  }, [session]);

  useEffect(() => { load(); }, [load]);

  async function react(id: string) {
    try {
      await api(`/feed/${id}/react`, {
        method: 'POST',
        token: session!.token, subdomain: session!.subdomain,
        body: JSON.stringify({}),
      });
      await load();
    } catch {}
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      data={items}
      keyExtractor={(p) => p.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          tintColor={theme.brand}
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Ionicons name="megaphone-outline" size={32} color={theme.textSubtle} />
          <Text style={{ marginTop: 8, color: theme.textMuted }}>No posts yet.</Text>
        </View>
      }
      renderItem={({ item: p }) => (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <View style={s.avatar}><Text style={s.avatarText}>{p.author.name.slice(0, 1).toUpperCase()}</Text></View>
            <Text style={s.author}>{p.author.name}</Text>
            <Text style={s.ts}>· {new Date(p.createdAt).toLocaleString()}</Text>
            <Chip label={p.type.replace('_', ' ')} tone={TYPE_TONE[p.type] ?? 'default'} />
            {p.scope === 'SCHOOL' && <Chip label="School-wide" tone="info" />}
            {p.isPinned && <Chip label="Pinned" tone="brand" />}
          </View>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.body}>{p.body}</Text>

          {p.attachmentsJson?.length ? (
            <View style={s.attachments}>
              {p.attachmentsJson.map((a, i) => (
                <Pressable key={i} onPress={() => Linking.openURL(a.url)} style={s.attachment}>
                  <Ionicons name="document-attach-outline" size={14} color={theme.textMuted} />
                  <Text numberOfLines={1} style={s.attachmentText}>{a.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={s.actions}>
            <Pressable onPress={() => react(p.id)} style={s.action}>
              <Ionicons name="thumbs-up-outline" size={16} color={theme.textMuted} />
              <Text style={s.actionText}>{p._count.reactions}</Text>
            </Pressable>
            <View style={s.action}>
              <Ionicons name="chatbubble-outline" size={16} color={theme.textMuted} />
              <Text style={s.actionText}>{p._count.comments}</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.brand, fontWeight: '700', fontSize: 13 },
  author: { fontWeight: '600', color: theme.text, fontSize: 13 },
  ts: { color: theme.textMuted, fontSize: 12 },
  title: { fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 4 },
  body: { fontSize: 14, color: theme.textMuted, marginTop: 4, lineHeight: 20 },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: theme.surfaceMuted, maxWidth: 220 },
  attachmentText: { fontSize: 12, color: theme.textMuted },
  actions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 13, color: theme.textMuted },
});
