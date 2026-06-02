import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE } from '../api/client';
import { theme } from '../theme';

type Message = { id: string; body: string; createdAt: string; author: { id: string; name: string } };

export default function ChatRoomScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { session } = useAuth();
  const { groupId, name } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    nav.setOptions({ title: name || 'Chat' });
  }, [name]);

  useEffect(() => {
    api<Message[]>(`/chat/groups/${groupId}/messages`, {
      token: session!.token, subdomain: session!.subdomain,
    })
      .then((m) => setMessages(m.reverse()))
      .catch(() => {});

    const sock = io(`${API_BASE}/chat`, { auth: { token: session!.token }, transports: ['websocket'] });
    socketRef.current = sock;
    sock.emit('joinGroup', groupId);
    sock.on('message', (msg: Message) => setMessages((m) => [...m, msg]));
    return () => { sock.disconnect(); };
  }, [groupId]);

  function send() {
    if (!draft.trim()) return;
    socketRef.current?.emit('sendMessage', { groupId, body: draft.trim() });
    setDraft('');
  }

  const meId = session?.user?.id;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.author.id === meId;
          return (
            <View style={[s.row, mine ? s.rowMine : s.rowTheirs]}>
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                {!mine && <Text style={s.author}>{item.author.name}</Text>}
                <Text style={mine ? s.textMine : s.textTheirs}>{item.body}</Text>
                <Text style={mine ? s.tsMine : s.tsTheirs}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View style={s.composer}>
        <TextInput
          style={s.input}
          placeholder="Type a message…"
          placeholderTextColor={theme.textSubtle}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
        />
        <Pressable onPress={send} style={[s.sendBtn, !draft.trim() && { opacity: 0.5 }]} disabled={!draft.trim()}>
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  row: { marginVertical: 4, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: theme.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderBottomLeftRadius: 4 },
  author: { fontSize: 11, color: theme.textMuted, fontWeight: '600', marginBottom: 2 },
  textMine: { color: '#fff', fontSize: 14 },
  textTheirs: { color: theme.text, fontSize: 14 },
  tsMine: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2, textAlign: 'right' },
  tsTheirs: { color: theme.textSubtle, fontSize: 10, marginTop: 2 },
  composer: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
  input: { flex: 1, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: theme.text, backgroundColor: theme.bg },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' },
});
