import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useColors } from '../../constants/colors';

function TabIcon({ emoji, focused, accentSoft }: { emoji: string; focused: boolean; accentSoft: string }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: accentSoft }]}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.inkFaint,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.divider,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        headerStyle: {
          backgroundColor: c.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: c.divider,
        } as any,
        headerTintColor: c.ink,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: c.ink },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Търсене',
          headerTitle: 'Пазарувай умно',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} accentSoft={c.accentSoft} />,
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Промоции',
          headerTitle: 'Промоции',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏷️" focused={focused} accentSoft={c.accentSoft} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Списък',
          headerTitle: 'Списък',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} accentSoft={c.accentSoft} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Бюджет',
          headerTitle: 'Бюджет',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} accentSoft={c.accentSoft} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
});
