import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';

type Group = {
  id: string;
  name: string | null;
  scope: 'GROUP' | 'DIRECT';
  section: { name: string; class: { label: string } } | null;
};

export default function ChatListScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!session) return;
    api<Group[]>('/chat/groups', { token: session.token, subdomain: session.subdomain })
      .then(setGroups)
      .catch(() => {});
  }, [session]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      data={groups}
      keyExtractor={(g) => g.id}
      ItemSeparatorComponent={() => <View style={s.divider} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Ionicons name="chatbubbles-outline" size={32} color={theme.textSubtle} />
          <Text style={{ marginTop: 8, color: theme.textMuted }}>No groups yet.</Text>
        </View>
      }
      renderItem={({ item: g }) => (
        <Pressable onPress={() => nav.navigate('ChatRoom', { groupId: g.id, name: g.name })} style={s.row}>
          <Ionicons
            name={g.scope === 'DIRECT' ? 'lock-closed-outline' : 'people-circle-outline'}
            size={22}
            color={theme.brand}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{g.name || 'Direct message'}</Text>
            {g.section && (
              <Text style={s.sub}>{g.section.class?.label} · {g.section.name}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.surface },
  name: { fontSize: 14, fontWeight: '600', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.border, marginLeft: 50 },
});
