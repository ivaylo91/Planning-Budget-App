import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Детайли',
            headerBackTitle: 'Назад',
            headerStyle: { backgroundColor: '#2E7D32' },
            headerTintColor: '#fff',
          }}
        />
      </Stack>
    </>
  );
}
