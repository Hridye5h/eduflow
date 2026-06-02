import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

type Mode = 'password' | 'otp';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [subdomain, setSubdomain] = useState('springfield');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (mode === 'password') {
        const res = await api<{ accessToken: string; user: any }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ subdomain, email: identifier, password }),
        });
        await signIn({ token: res.accessToken, user: res.user, subdomain });
      } else if (!otpSent) {
        await api('/auth/otp/request', {
          method: 'POST',
          body: JSON.stringify({ subdomain, identifier }),
        });
        setOtpSent(true);
      } else {
        const res = await api<{ accessToken: string; user: any }>('/auth/otp/verify', {
          method: 'POST',
          body: JSON.stringify({ subdomain, identifier, code }),
        });
        await signIn({ token: res.accessToken, user: res.user, subdomain });
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <View style={s.brand}>
        <View style={s.logo}><Text style={s.logoText}>E</Text></View>
        <Text style={s.brandText}>EduFlow</Text>
      </View>

      <View style={s.card}>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your school portal.</Text>

        <View style={s.tabs}>
          {(['password', 'otp'] as const).map((m) => (
            <Pressable key={m} onPress={() => { setMode(m); setOtpSent(false); }} style={[s.tab, mode === m && s.tabActive]}>
              <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                {m === 'password' ? 'Email + password' : 'OTP (parents)'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>School subdomain</Text>
        <TextInput style={s.input} value={subdomain} onChangeText={setSubdomain} autoCapitalize="none" />

        <Text style={s.label}>{mode === 'password' ? 'Email' : 'Phone or email'}</Text>
        <TextInput style={s.input} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType={mode === 'otp' ? 'default' : 'email-address'} />

        {mode === 'password' ? (
          <>
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} secureTextEntry value={password} onChangeText={setPassword} />
          </>
        ) : otpSent ? (
          <>
            <Text style={s.label}>6-digit code</Text>
            <TextInput style={s.input} keyboardType="number-pad" value={code} onChangeText={setCode} />
          </>
        ) : null}

        <Pressable style={[s.btn, busy && s.btnDisabled]} onPress={submit} disabled={busy}>
          <Text style={s.btnText}>
            {busy ? 'Working…' : mode === 'password' ? 'Sign in' : otpSent ? 'Verify code' : 'Send OTP'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f7f8fb' },
  brand: { alignItems: 'center', marginBottom: 24, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  brandText: { fontSize: 18, fontWeight: '700', color: '#1a1f2c' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#e4e7ee' },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1f2c' },
  subtitle: { fontSize: 14, color: '#5b6478', marginTop: 4, marginBottom: 18 },
  tabs: { flexDirection: 'row', backgroundColor: '#f1f3f9', borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#5b6478' },
  tabTextActive: { color: '#1a1f2c' },
  label: { fontSize: 11, fontWeight: '700', color: '#8b93a7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cfd4df', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1a1f2c', backgroundColor: '#fff' },
  btn: { backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
