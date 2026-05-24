import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { requestNotificationPermission } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => { requestNotificationPermission(); }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fffaf0" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Детайли',
            headerBackTitle: 'Назад',
            headerStyle: { backgroundColor: '#fffaf0' } as any,
            headerTintColor: '#2b1d12',
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}
