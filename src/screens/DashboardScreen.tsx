import { useMemo } from 'react';
import { Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../theme/theme';

type DashboardScreenProps = {
  riderName: string;
  shiftLabel: string;
  premium: number;
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  onNavigatePolicy: () => void;
};

export function DashboardScreen({
  riderName,
  shiftLabel,
  premium,
  onNavigateHome,
  onNavigateHistory,
  onNavigatePolicy,
}: DashboardScreenProps) {
  const greeting = useMemo(() => `GOOD AFTERNOON, ${riderName.toUpperCase()} ☀️`, [riderName]);

  return (
    <SafeAreaView style={styles.root} accessible accessibilityLabel="Rider dashboard screen">
      <View style={styles.frame}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.title}>Rider dashboard</Text>
          <Text style={styles.subtitle}>Week of Apr 1 – Apr 7 · Policy active · {shiftLabel}</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabItem, styles.tabActive]} onPress={onNavigateHome}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={onNavigateHistory}>
            <Text style={styles.tabText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={onNavigatePolicy}>
            <Text style={styles.tabText}>Policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.frame}>
          <View style={styles.policyCard}>
          <View style={styles.policyRow}>
            <View>
              <View style={styles.policyStatus}>
                <Animated.View style={styles.statusDot} />
                <Text style={styles.statusText}>ACTIVE COVERAGE</Text>
              </View>
              <Text style={styles.policyPremium}>₹600</Text>
              <Text style={styles.policyWeek}>Paid out this week</Text>
            </View>
            <View style={styles.policyRight}>
              <Text style={styles.policyCaption}>Next debit</Text>
              <Text style={styles.nextPremium}>₹{premium}</Text>
              <Text style={styles.policyCaption}>Mon, Apr 7</Text>
            </View>
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Week progress</Text>
              <Text style={styles.progressLabel}>40%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
          </View>
        </View>

          <Text style={styles.sectionTitle}>Live trigger status</Text>
          <View style={styles.weatherLive}>
          <View style={styles.weatherHeader}>
            <Text style={styles.weatherTitle}>Weather · Coimbatore</Text>
            <View style={styles.liveWrap}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.weatherGrid}>{/* CSS grid mapped to flex row layout for RN */}
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherValue}>38°C</Text>
              <Text style={styles.weatherLabel}>Heat index</Text>
              <Text style={[styles.weatherTrend, styles.weatherWarn]}>↑ Watch</Text>
            </View>
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherValue}>12km</Text>
              <Text style={styles.weatherLabel}>Visibility</Text>
              <Text style={styles.weatherTrend}>Clear</Text>
            </View>
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherValue}>AQI 94</Text>
              <Text style={styles.weatherLabel}>Air quality</Text>
              <Text style={styles.weatherTrend}>Safe</Text>
            </View>
          </View>
        </View>

          <Text style={styles.sectionTitle}>Recent payouts</Text>
          <View style={styles.claimRow}>
          <View>
            <Text style={styles.claimType}>🌧 RAIN TRIGGER</Text>
            <Text style={styles.claimDate}>Apr 2, 2026 · 11:00 AM</Text>
          </View>
          <View style={styles.claimRight}>
            <Text style={styles.claimAmount}>₹500</Text>
            <Text style={styles.claimBadge}>AUTO-PAID</Text>
          </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.navBar}>
        <View style={styles.navContent}>
          <TouchableOpacity style={styles.navItem} onPress={onNavigateHome} accessible accessibilityLabel="Home tab">
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>HOME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={onNavigateHistory} accessible accessibilityLabel="History tab">
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>HISTORY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={onNavigatePolicy} accessible accessibilityLabel="Policy tab">
            <Text style={styles.navIcon}>🛡️</Text>
            <Text style={styles.navLabel}>POLICY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  frame: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.lg },
  greeting: { fontSize: 12, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textSubtle },
  tabTextActive: { color: colors.primary },
  scrollContent: { paddingBottom: 90, alignItems: 'center' },
  policyCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.15)',
    borderRadius: 18,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  policyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.2)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: spacing.sm },
  statusText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  policyPremium: { fontSize: 36, fontWeight: '900', color: colors.primary, marginTop: spacing.md },
  policyWeek: { fontSize: 11, color: colors.textSubtle },
  policyRight: { alignItems: 'flex-end' },
  policyCaption: { fontSize: 11, color: colors.textSubtle, marginBottom: 4 },
  nextPremium: { fontSize: 20, fontWeight: '800', color: colors.amber },
  progressWrap: { marginTop: spacing.md },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: 10, color: colors.textSubtle },
  progressBar: { height: 5, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#CBD5E1', marginTop: spacing.lg, marginBottom: spacing.sm },
  weatherLive: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 14,
    padding: spacing.md,
  },
  weatherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  weatherTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.info, textTransform: 'uppercase' },
  liveWrap: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 },
  liveText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  weatherGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  weatherMetric: { flex: 1, alignItems: 'center' },
  weatherValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  weatherLabel: { fontSize: 10, color: colors.textSubtle, marginTop: 2 },
  weatherTrend: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  weatherWarn: { color: colors.amber },
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  claimType: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  claimDate: { fontSize: 10, color: colors.textSubtle, marginTop: 2 },
  claimRight: { alignItems: 'flex-end' },
  claimAmount: { fontSize: 16, fontWeight: '800', color: colors.primary },
  claimBadge: {
    fontSize: 9,
    fontWeight: '700',
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.2)',
    marginTop: 3,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  navContent: { width: '100%', maxWidth: 520, flexDirection: 'row', paddingHorizontal: spacing.lg },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 18 },
  navLabel: { fontSize: 9, fontWeight: '700', color: colors.textSubtle, letterSpacing: 0.5 },
  navLabelActive: { color: colors.primary },
});
