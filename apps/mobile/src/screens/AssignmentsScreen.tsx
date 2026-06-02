import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Chip } from '../components/Card';

type Item = {
  id: string;
  title: string;
  body: string;
  assignment: { id: string; dueAt: string; _count: { submissions: number } };
};

export default function AssignmentsScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!session) return;
    // Students see their section's assignments; pilot fallback: read /feed and filter ASSIGNMENT
    api<any[]>('/feed', { token: session.token, subdomain: session.subdomain })
      .then((posts) => {
        const a = posts.filter((p) => p.type === 'ASSIGNMENT' && p.assignment).map((p) => ({
          id: p.id, title: p.title, body: p.body, assignment: p.assignment,
        }));
        setItems(a);
      })
      .catch(() => {});
  }, [session]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(i) => i.id}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Ionicons name="document-text-outline" size={32} color={theme.textSubtle} />
          <Text style={{ marginTop: 8, color: theme.textMuted }}>No assignments.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const past = new Date() > new Date(item.assignment.dueAt);
        return (
          <Pressable
            style={s.card}
            onPress={() => nav.navigate('AssignmentDetail', { id: item.assignment.id })}
          >
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body} numberOfLines={2}>{item.body}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Chip label={`Due ${new Date(item.assignment.dueAt).toLocaleDateString()}`} tone={past ? 'danger' : 'brand'} />
              <Chip label={`${item.assignment._count.submissions} submitted`} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14 },
  title: { fontSize: 15, fontWeight: '700', color: theme.text },
  body: { fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 18 },
});
