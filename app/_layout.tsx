import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { requestNotificationPermission } from '../lib/notifications';
import { useColors } from '../constants/colors';
import { AuthProvider, useAuth } from '../lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}

function Navigator() {
  const c = useColors();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    requestNotificationPermission();
    AsyncStorage.getItem('onboarding_done').then((val) => setOnboarded(!!val));
  }, []);

  useEffect(() => {
    if (onboarded === null || authLoading) return;
    if (!onboarded) {
      router.replace('/onboarding');
    } else if (!user) {
      router.replace('/auth');
    }
  }, [user, onboarded, authLoading]);

  return (
    <>
      <StatusBar style={c.statusBar} backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="history" />
        <Stack.Screen name="shopping" />
        <Stack.Screen name="scanner" />
        <Stack.Screen name="trends" />
      </Stack>
    </>
  );
}
