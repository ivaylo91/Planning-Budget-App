import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { requestNotificationPermission } from '../lib/notifications';
import { useColors } from '../constants/colors';

export default function RootLayout() {
  const c = useColors();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
    AsyncStorage.getItem('onboarding_done').then((val) => {
      if (!val) router.replace('/onboarding');
      setChecked(true);
    });
  }, []);

  return (
    <>
      <StatusBar style={c.statusBar} backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="history" />
      </Stack>
    </>
  );
}
