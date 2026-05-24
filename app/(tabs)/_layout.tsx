import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.inkFaint,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: 'rgba(43,29,18,0.08)',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        headerStyle: {
          backgroundColor: Colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(43,29,18,0.08)',
        } as any,
        headerTintColor: Colors.ink,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: Colors.ink },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Търсене',
          headerTitle: 'Пазарувай умно',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Промоции',
          headerTitle: 'Промоции',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏷️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Списък',
          headerTitle: 'Списък',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Бюджет',
          headerTitle: 'Бюджет',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36, height: 28, alignItems: 'center',
    justifyContent: 'center', borderRadius: 14,
  },
  iconWrapActive: { backgroundColor: Colors.accentSoft },
});
