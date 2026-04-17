import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Claim } from '../../api/claimsClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Toast } from '../../components/ui/Toast';
import { usePolicy } from '../../hooks/usePolicy';
import { payoutService } from '../../services/payoutService';
import { colors } from '../../theme/colors';
import { BottomNav } from './BottomNav';
import { PayoutHistory } from './PayoutHistory';
import { PolicyStatusCard } from './PolicyStatusCard';
import { TriggerMonitor } from './TriggerMonitor';

type RiderDashboardProps = {
  riderId: string;
  riderName?: string;
  onSwitchToAdmin?: () => void;
};

type RiderTab = 'home' | 'history' | 'policy';

export function RiderDashboard({ riderId, riderName, onSwitchToAdmin }: RiderDashboardProps) {
  const [activeTab, setActiveTab] = useState<RiderTab>('home');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data, loading, error } = usePolicy(riderId);

  useEffect(() => {
    if (!riderId) return;

    let active = true;

    const loadClaims = async () => {
      try {
        const result = await payoutService.getClaims(riderId);
        const total = await payoutService.getWeeklyTotal(riderId);
        if (!active) return;
        setClaims(result);
        setWeeklyTotal(total);
        setClaimError(null);
      } catch (err) {
        if (!active) return;
        setClaims([]);
        setWeeklyTotal(0);
        setClaimError(err instanceof Error ? err.message : 'Unable to load payouts.');
      }
    };

    loadClaims();
    return () => {
      active = false;
    };
  }, [riderId]);

  const policy = data?.policy ?? null;
  const weekProgress = data?.week_progress ?? 0;
  const nextPremium = data?.next_premium ?? 0;
  const triggers = data?.trigger_statuses ?? [];
  const safeName = (riderName || '').trim() || 'Rider';

  const headerSubtitle = useMemo(() => (policy ? `Policy ${policy.status.toUpperCase()}` : 'No active policy'), [policy]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {safeName}</Text>
          <Text style={styles.title}>Rider dashboard</Text>
          <Text style={styles.subtitle}>Rider {riderId} · {headerSubtitle}</Text>
        </View>
        {onSwitchToAdmin ? (
          <PrimaryButton label="Admin" onPress={onSwitchToAdmin} variant="outline" />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? <Text style={styles.helper}>Loading policy details...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {policy ? (
          <PolicyStatusCard policy={policy} weekProgress={weekProgress} nextPremium={nextPremium} />
        ) : (
          !loading && <Text style={styles.helper}>No policy data available yet.</Text>
        )}

        {(activeTab === 'home' || activeTab === 'policy') && triggers.length ? (
          <TriggerMonitor triggers={triggers} />
        ) : null}

        {(activeTab === 'home' || activeTab === 'history') ? (
          <PayoutHistory riderId={riderId} claims={claims} totalThisWeek={weeklyTotal} />
        ) : null}
      </ScrollView>

      {claimError ? <Toast message={claimError} variant="error" onClose={() => setClaimError(null)} /> : null}
      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink2 },
  greeting: { fontSize: 14, fontWeight: '700', color: colors.tealDark, marginBottom: 4 },
  subtitle: { fontSize: 12, color: colors.muted },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  helper: { color: colors.muted, fontSize: 12 },
  error: { color: colors.coral, fontSize: 12 },
});
