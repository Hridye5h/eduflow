import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';
import { Chip } from '../components/Card';

export default function AssignmentDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const { session } = useAuth();
  const isStudent = session?.user?.role === 'STUDENT';

  const [detail, setDetail] = useState<any>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/assignments/${id}`, { token: session!.token, subdomain: session!.subdomain })
      .then(setDetail)
      .catch(() => {});
  }, [id]);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api(`/assignments/${id}/submit`, {
        method: 'POST',
        token: session!.token, subdomain: session!.subdomain,
        body: JSON.stringify({ body }),
      });
      Alert.alert('Submitted', 'Your submission has been recorded.');
      setBody('');
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return <View style={{ padding: 20 }}><Text style={{ color: theme.textMuted }}>Loading…</Text></View>;
  const past = new Date() > new Date(detail.dueAt);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.title}>{detail.post.title}</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <Chip label={`Due ${new Date(detail.dueAt).toLocaleString()}`} tone={past ? 'danger' : 'brand'} />
          {detail.maxMarks != null && <Chip label={`Max ${detail.maxMarks}`} />}
        </View>
        <Text style={s.body}>{detail.post.body}</Text>
      </View>

      {isStudent && (
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={s.section}>Your submission</Text>
          <TextInput
            style={s.input}
            multiline
            placeholder="Type your answer here…"
            placeholderTextColor={theme.textSubtle}
            value={body}
            onChangeText={setBody}
          />
          <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy || !body.trim()}>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={s.btnText}>{busy ? 'Sending…' : 'Submit'}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 16 },
  title: { fontSize: 17, fontWeight: '700', color: theme.text },
  body: { fontSize: 14, color: theme.textMuted, marginTop: 10, lineHeight: 20 },
  section: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: theme.textSubtle, letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 10, padding: 12, minHeight: 140, color: theme.text, textAlignVertical: 'top', backgroundColor: theme.bg },
  btn: { marginTop: 12, backgroundColor: theme.brand, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
