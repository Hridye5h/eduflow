import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Chip } from '../components/Card';

type Exam = {
  id: string;
  name: string;
  type: string;
  maxMarks: number;
  publishedAt: string | null;
  class: { label: string };
};

export default function MarksScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    if (!session) return;
    api<Exam[]>('/exams', { token: session.token, subdomain: session.subdomain })
      .then(setExams)
      .catch(() => {});
  }, [session]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Pressable
        style={s.cta}
        onPress={() => nav.navigate('ReportCard')}
      >
        <Ionicons name="document-text-outline" size={20} color={theme.brand} />
        <View style={{ flex: 1 }}>
          <Text style={s.ctaTitle}>View report card</Text>
          <Text style={s.ctaSub}>Cumulative across all published exams</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
      </Pressable>

      <Text style={s.section}>Exams</Text>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={exams}
        keyExtractor={(e) => e.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={{ color: theme.textMuted, textAlign: 'center', padding: 20 }}>No exams.</Text>}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.sub}>{item.class.label} · max {item.maxMarks}</Text>
            </View>
            {item.publishedAt ? (
              <Chip label="Published" tone="success" />
            ) : (
              <Chip label="Draft" tone="warn" />
            )}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, margin: 16, backgroundColor: theme.brandSoft, borderRadius: 14 },
  ctaTitle: { fontSize: 14, fontWeight: '700', color: theme.brand },
  ctaSub: { fontSize: 12, color: theme.brand, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: theme.textSubtle, paddingHorizontal: 16, marginTop: 4, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  name: { fontSize: 14, fontWeight: '600', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
});
