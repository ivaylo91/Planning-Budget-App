import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, AppColors } from '../constants/colors';
import { useAuth } from '../lib/auth';
import { getScrapeRuns } from '../lib/queries';
import { ChevronLeftIcon } from '../components/Icons';
import { StoreIcon } from '../components/StoreIcon';
import type { ScrapeRun } from '../types';

const ADMIN_EMAIL = 'ipenev91@gmail.com';
const STORES = ['billa', 'lidl', 'kaufland', 'metro', 'fantastico'];
const GH_ACTIONS_URL = 'https://github.com/ivaylo91/Planning-Budget-App/actions/workflows/weekly_update.yml';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'току-що';
  if (mins < 60) return `преди ${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `преди ${hours} ч`;
  const days = Math.floor(hours / 24);
  return `преди ${days} дни`;
}

function statusColor(status: ScrapeRun['status'], c: AppColors): string {
  if (status === 'success') return c.good;
  if (status === 'partial') return c.warn;
  if (status === 'running') return c.accent;
  return c.bad;
}

function statusEmoji(status: ScrapeRun['status']): string {
  if (status === 'success') return '✓';
  if (status === 'partial') return '⚠';
  if (status === 'running') return '⏳';
  return '✗';
}

export default function AdminScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Access gate
  if (user && user.email !== ADMIN_EMAIL) {
    return (
      <View style={[styles.centered, { backgroundColor: c.canvas }]}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>🔒</Text>
        <Text style={[styles.gateTitle, { color: c.ink }]}>Нямаш достъп</Text>
        <TouchableOpacity style={[styles.backPill, { backgroundColor: c.accentSoft }]} onPress={() => router.back()}>
          <Text style={[styles.backPillText, { color: c.accent }]}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getScrapeRuns(40);
      setRuns(data);
    } catch {
      Alert.alert('Грешка', 'Не може да се заредят данните от scrape_runs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Latest run per store
  const latestByStore = useMemo(() => {
    const map: Record<string, ScrapeRun> = {};
    for (const run of runs) {
      if (!map[run.store_slug]) map[run.store_slug] = run;
    }
    return map;
  }, [runs]);

  const lastRunTime = runs[0]?.started_at;
  const recentRuns = runs.slice(0, 15);

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      {/* Nav */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.surface }]} onPress={() => router.back()}>
          <ChevronLeftIcon size={20} color={c.ink} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Admin</Text>
          <Text style={[styles.navSub, { color: c.inkFaint }]}>Scraper dashboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={c.accent} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.accent} />}
        >
          {/* Summary header */}
          <View style={[styles.summaryCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.summaryLabel, { color: c.inkFaint }]}>Последно стартиране</Text>
            <Text style={[styles.summaryTime, { color: c.ink }]}>
              {lastRunTime ? timeAgo(lastRunTime) : 'Няма данни'}
            </Text>
            {lastRunTime && (
              <Text style={[styles.summaryDate, { color: c.inkSoft }]}>
                {new Date(lastRunTime).toLocaleString('bg-BG')}
              </Text>
            )}
          </View>

          {/* Per-store status */}
          <SectionLabel label="Статус по магазин" c={c} />
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            {STORES.map((slug, i) => {
              const run = latestByStore[slug];
              return (
                <View key={slug}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: c.divider }]} />}
                  <View style={styles.storeRow}>
                    <StoreIcon slug={slug} size={28} />
                    <View style={styles.storeInfo}>
                      <Text style={[styles.storeName, { color: c.ink }]}>
                        {slug.charAt(0).toUpperCase() + slug.slice(1)}
                      </Text>
                      {run ? (
                        <Text style={[styles.storeSub, { color: c.inkFaint }]}>
                          {run.products_upserted} продукта · {timeAgo(run.started_at)}
                        </Text>
                      ) : (
                        <Text style={[styles.storeSub, { color: c.inkFaint }]}>Няма данни</Text>
                      )}
                    </View>
                    {run ? (
                      <View style={[styles.statusBadge, { backgroundColor: statusColor(run.status, c) + '22' }]}>
                        <Text style={[styles.statusEmoji, { color: statusColor(run.status, c) }]}>
                          {statusEmoji(run.status)}
                        </Text>
                        <Text style={[styles.statusText, { color: statusColor(run.status, c) }]}>
                          {run.status}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: c.surfaceAlt }]}>
                        <Text style={[styles.statusText, { color: c.inkFaint }]}>—</Text>
                      </View>
                    )}
                  </View>
                  {run?.error_message && (
                    <Text style={[styles.errorMsg, { color: c.bad, backgroundColor: '#fde8e4' }]} numberOfLines={2}>
                      {run.error_message}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Recent runs log */}
          {recentRuns.length > 0 && (
            <>
              <SectionLabel label={`Последни ${recentRuns.length} стартирания`} c={c} />
              <View style={[styles.card, { backgroundColor: c.surface }]}>
                {recentRuns.map((run, i) => (
                  <View key={run.id}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: c.divider }]} />}
                    <View style={styles.runRow}>
                      <StoreIcon slug={run.store_slug} size={18} />
                      <View style={styles.runInfo}>
                        <Text style={[styles.runStore, { color: c.ink }]}>
                          {run.store_slug.charAt(0).toUpperCase() + run.store_slug.slice(1)}
                        </Text>
                        <Text style={[styles.runMeta, { color: c.inkFaint }]}>
                          {timeAgo(run.started_at)} · {run.products_upserted} продукта
                        </Text>
                      </View>
                      <Text style={[styles.runStatus, { color: statusColor(run.status, c) }]}>
                        {statusEmoji(run.status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Actions */}
          <SectionLabel label="Действия" c={c} />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.surface }]}
            onPress={() => Linking.openURL(GH_ACTIONS_URL)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: c.ink }]}>Ръчно стартиране</Text>
              <Text style={[styles.actionSub, { color: c.inkSoft }]}>Отваря GitHub Actions в браузъра</Text>
            </View>
            <Text style={[styles.actionArrow, { color: c.inkFaint }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.surface }]}
            onPress={() => load(true)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: c.ink }]}>Обнови данните</Text>
              <Text style={[styles.actionSub, { color: c.inkSoft }]}>Зарежда scrape_runs от Supabase</Text>
            </View>
          </TouchableOpacity>

          {runs.length === 0 && (
            <View style={styles.noRuns}>
              <Text style={[styles.noRunsText, { color: c.inkSoft }]}>
                Няма записани scrape runs. Стартирай workflow-то от GitHub Actions, след което провери таблица scrape_runs в Supabase.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
    gateTitle: { fontSize: 18, fontWeight: '700' },
    backPill: { borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10 },
    backPillText: { fontWeight: '700', fontSize: 14 },

    navBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12,
    },
    iconBtn: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    navCenter: { alignItems: 'center' },
    navTitle: { fontSize: 18, fontWeight: '800', color: c.ink, letterSpacing: -0.3 },
    navSub: { fontSize: 11, marginTop: 1 },

    content: { paddingHorizontal: 16 },

    summaryCard: {
      borderRadius: 18, padding: 16, marginTop: 4,
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    summaryTime: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    summaryDate: { fontSize: 12, marginTop: 3 },

    card: {
      borderRadius: 18, overflow: 'hidden',
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    divider: { height: 1, marginLeft: 16 },

    storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    storeInfo: { flex: 1 },
    storeName: { fontSize: 14, fontWeight: '700' },
    storeSub: { fontSize: 11, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusEmoji: { fontSize: 12, fontWeight: '800' },
    statusText: { fontSize: 11, fontWeight: '700' },
    errorMsg: { fontSize: 11, marginHorizontal: 14, marginBottom: 10, padding: 8, borderRadius: 8, lineHeight: 16 },

    runRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
    runInfo: { flex: 1 },
    runStore: { fontSize: 13, fontWeight: '600' },
    runMeta: { fontSize: 11, marginTop: 1 },
    runStatus: { fontSize: 16, fontWeight: '800' },

    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 18, padding: 16, marginBottom: 10,
      shadowColor: c.shadow, shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    actionLabel: { fontSize: 15, fontWeight: '600' },
    actionSub: { fontSize: 12, marginTop: 2 },
    actionArrow: { fontSize: 18, fontWeight: '700' },

    noRuns: { marginTop: 8, padding: 16, borderRadius: 12, backgroundColor: c.surfaceAlt },
    noRunsText: { fontSize: 13, lineHeight: 20 },
  });
}
