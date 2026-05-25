import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { requestNotificationPermission } from '../lib/notifications';
import { useColors } from '../constants/colors';

export default function RootLayout() {
  const c = useColors();
  useEffect(() => { requestNotificationPermission(); }, []);

  return (
    <>
      <StatusBar style={c.statusBar} backgroundColor={c.canvas} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Детайли',
            headerBackTitle: 'Назад',
            headerStyle: { backgroundColor: c.surface } as any,
            headerTintColor: c.ink,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}
