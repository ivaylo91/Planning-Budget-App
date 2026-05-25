import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors, Gradients } from '../constants/colors';
import { useAuth } from '../lib/auth';

export default function AuthScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || password.length < 6) {
      Alert.alert('Грешка', 'Въведи имейл и парола (мин. 6 символа).');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(emailTrimmed, password);
        Alert.alert(
          'Акаунтът е създаден',
          'Провери имейла си за потвърждение, след което влез.',
          [{ text: 'OK', onPress: () => setMode('signin') }]
        );
      } else {
        await signIn(emailTrimmed, password);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Нещо се обърка. Опитай отново.';
      Alert.alert('Грешка', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={Gradients.canvas}
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.header}>
            <LinearGradient colors={Gradients.accent} style={styles.logoWrap}>
              <Text style={styles.logoEmoji}>🛒</Text>
            </LinearGradient>
            <Text style={styles.appName}>Пазарувай умно</Text>
            <Text style={styles.tagline}>
              {mode === 'signin' ? 'Влез в акаунта си' : 'Създай безплатен акаунт'}
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            {/* Toggle */}
            <View style={[styles.toggle, { backgroundColor: c.canvas }]}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signin' && { backgroundColor: c.surface }]}
                onPress={() => setMode('signin')}
              >
                <Text style={[styles.toggleText, { color: mode === 'signin' ? c.ink : c.inkFaint }]}>
                  Вход
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signup' && { backgroundColor: c.surface }]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.toggleText, { color: mode === 'signup' ? c.ink : c.inkFaint }]}>
                  Регистрация
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: c.canvas, color: c.ink, borderColor: c.divider }]}
              placeholder="Имейл адрес"
              placeholderTextColor={c.inkFaint}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.canvas, color: c.ink, borderColor: c.divider }]}
              placeholder="Парола (мин. 6 символа)"
              placeholderTextColor={c.inkFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={Gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>
                      {mode === 'signin' ? 'Влез' : 'Регистрирай се'}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={[styles.disclaimer, { color: c.inkFaint }]}>
            Твоите данни са защитени и никога не се споделят.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 24 },

    header: { alignItems: 'center', gap: 10 },
    logoWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    logoEmoji: { fontSize: 40 },
    appName: { fontSize: 26, fontWeight: '900', color: c.ink, letterSpacing: -0.5 },
    tagline: { fontSize: 15, color: c.inkSoft, fontWeight: '500' },

    card: {
      borderRadius: 24, padding: 20, gap: 14,
      shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 }, elevation: 4,
    },

    toggle: { flexDirection: 'row', borderRadius: 14, padding: 4 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
    toggleText: { fontSize: 14, fontWeight: '700' },

    input: {
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
      fontSize: 15, borderWidth: 1,
    },

    submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  });
}
