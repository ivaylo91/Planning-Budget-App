import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Switch, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, AppColors, Gradients } from '../constants/colors';
import { useAuth } from '../lib/auth';
import { ChevronLeftIcon, ChevronRightIcon, BellIcon, ListIcon, HeartIcon, ChartIcon } from '../components/Icons';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [notifBudget, setNotifBudget] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('notif_budget').then((val) => {
      if (val !== null) setNotifBudget(val !== '0');
    });
  }, []);

  const handleToggleNotif = async (val: boolean) => {
    setNotifBudget(val);
    await AsyncStorage.setItem('notif_budget', val ? '1' : '0');
  };

  const handleSignOut = () => {
    Alert.alert('Изход', 'Сигурен ли си, че искаш да излезеш?', [
      { text: 'Отказ', style: 'cancel' },
      { text: 'Изход', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = user?.email?.[0].toUpperCase() ?? '?';
  const displayName = user?.email?.split('@')[0] ?? '';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      {/* Nav */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color={c.ink} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: c.surface }]}>
          <LinearGradient colors={Gradients.accent} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
            {memberSince ? (
              <Text style={styles.profileSince}>Член от {memberSince}</Text>
            ) : null}
          </View>
        </View>

        {/* Notifications */}
        <SectionLabel label="Известия" c={c} />
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: c.accentSoft }]}>
              <BellIcon size={16} color={c.accent} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowLabel, { color: c.ink }]}>Надвишен бюджет</Text>
              <Text style={[styles.rowSub, { color: c.inkSoft }]}>Известие при надхвърляне</Text>
            </View>
            <Switch
              value={notifBudget}
              onValueChange={handleToggleNotif}
              trackColor={{ false: c.surfaceAlt, true: c.accentSoft }}
              thumbColor={notifBudget ? c.accent : c.inkFaint}
            />
          </View>
        </View>

        {/* Account */}
        <SectionLabel label="Акаунт" c={c} />
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <RowLink
            icon={<HeartIcon size={16} color="#e05252" />}
            label="Следени продукти"
            onPress={() => router.push('/watchlist')}
            c={c}
          />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <RowLink
            icon={<ListIcon size={16} color={c.accent} />}
            label="История на списъците"
            onPress={() => router.push('/history')}
            c={c}
          />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <RowLink
            icon={<ChartIcon size={16} color={c.accent} />}
            label="Тенденции в разходите"
            onPress={() => router.push('/trends')}
            c={c}
          />
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: '#fde8e4' }]}>
              <Text style={{ fontSize: 15 }}>🚪</Text>
            </View>
            <Text style={[styles.rowLabel, { color: c.bad, flex: 1 }]}>Изход</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <SectionLabel label="Приложение" c={c} />
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: c.accentSoft }]}>
              <Text style={{ fontSize: 15 }}>🛒</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowLabel, { color: c.ink }]}>Пазарувай умно</Text>
              <Text style={[styles.rowSub, { color: c.inkSoft }]}>Версия {APP_VERSION}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.divider }]} />
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: c.accentSoft }]}>
              <Text style={{ fontSize: 15 }}>💱</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowLabel, { color: c.ink }]}>Курс на БНБ</Text>
              <Text style={[styles.rowSub, { color: c.inkSoft }]}>1 € = 1.95583 лв. (фиксиран)</Text>
            </View>
          </View>
        </View>

        {user?.email === 'ipenev91@gmail.com' && (
          <>
            <SectionLabel label="Разработчик" c={c} />
            <View style={[styles.section, { backgroundColor: c.surface }]}>
              <RowLink
                icon={<Text style={{ fontSize: 15 }}>⚙️</Text>}
                label="Admin панел"
                onPress={() => router.push('/admin')}
                c={c}
              />
            </View>
          </>
        )}

        <Text style={[styles.footer, { color: c.inkFaint }]}>
          © 2026 Пазарувай умно
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, c }: { label: string; c: AppColors }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: c.inkFaint,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: 20, marginBottom: 6, marginLeft: 4,
    }}>
      {label}
    </Text>
  );
}

function RowLink({ icon, label, onPress, c }: { icon: React.ReactNode; label: string; onPress: () => void; c: AppColors }) {
  return (
    <TouchableOpacity style={styles2.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles2.icon, { backgroundColor: c.accentSoft }]}>{icon}</View>
      <Text style={[styles2.label, { color: c.ink }]}>{label}</Text>
      <ChevronRightIcon size={14} color={c.inkFaint} />
    </TouchableOpacity>
  );
}

const styles2 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '500' },
});

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },

    navBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    navTitle: { fontSize: 18, fontWeight: '800', color: c.ink, letterSpacing: -0.3 },

    content: { paddingHorizontal: 16 },

    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderRadius: 20, padding: 16, marginTop: 4,
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 }, elevation: 2,
    },
    avatar: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 16, fontWeight: '800', color: c.ink },
    profileEmail: { fontSize: 12, color: c.inkSoft, marginTop: 1 },
    profileSince: { fontSize: 11, color: c.inkFaint, marginTop: 3 },

    section: {
      borderRadius: 18, overflow: 'hidden',
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: '600' },
    rowSub: { fontSize: 12, marginTop: 1 },
    divider: { height: 1, marginLeft: 16 + 32 + 12 },

    footer: { fontSize: 11, textAlign: 'center', marginTop: 28 },
  });
}
