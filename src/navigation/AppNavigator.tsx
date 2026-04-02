import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { approveClaim, fireDemoTrigger, getFraudQueue, getPortfolioStats, rejectClaim, TriggerEvent } from '../api/adminClient';
import { getClaims } from '../api/claimsClient';
import { Claim } from '../api/claimsClient';
import { getCurrentPolicy } from '../api/policiesClient';
import { BottomNav } from '../features/dashboard/BottomNav';
import { PayoutHistory } from '../features/dashboard/PayoutHistory';
import { PolicyStatusCard } from '../features/dashboard/PolicyStatusCard';
import { TriggerMonitor } from '../features/dashboard/TriggerMonitor';
import { OnboardingShell } from '../features/onboarding/OnboardingShell';
import { OnboardingState } from '../features/onboarding/types';
import { subscribeToTriggerEvents } from '../services/triggerService';
import { colors } from '../theme/colors';
import { paiseToInr } from '../utils/currency';
import { RootScreen, RiderTab } from './routes';

export function AppNavigator() {
  const [screen, setScreen] = useState<RootScreen>('Onboarding');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});

  const [riderTab, setRiderTab] = useState<RiderTab>('home');
  const [policyData, setPolicyData] = useState<Awaited<ReturnType<typeof getCurrentPolicy>> | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [triggerEvents, setTriggerEvents] = useState<TriggerEvent[]>([]);

  const [portfolioStats, setPortfolioStats] = useState<{ active_policies: number; loss_ratio: number; weekly_payouts_paise: number; fraud_queue_size: number } | null>(null);
  const [fraudQueue, setFraudQueue] = useState<Array<{ id: string; rider_id: string; fraud_score: number; flag_reason: string; trigger_type: string }>>([]);

  useEffect(() => {
    if (screen !== 'RiderDashboard' || !onboardingState.riderId) return;

    const load = async () => {
      const [policy, riderClaims] = await Promise.all([getCurrentPolicy(onboardingState.riderId!), getClaims(onboardingState.riderId!)]);
      setPolicyData(policy);
      setClaims(riderClaims);
    };

    load().catch(() => null);
  }, [screen, onboardingState.riderId]);

  useEffect(() => {
    const unsubscribe = subscribeToTriggerEvents(setTriggerEvents, 15 * 1000);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (screen !== 'AdminDashboard') return;

    const load = async () => {
      const [portfolio, queue] = await Promise.all([getPortfolioStats(), getFraudQueue()]);
      setPortfolioStats(portfolio);
      setFraudQueue(queue);
    };

    load().catch(() => null);
  }, [screen]);

  const totalThisWeek = useMemo(() => claims.filter((claim) => claim.status === 'paid' || claim.status === 'approved').reduce((sum, claim) => sum + claim.amount_paise, 0), [claims]);

  return (
    <View style={styles.root}>
      {screen === 'Onboarding' ? (
        <OnboardingShell
          step={onboardingStep}
          onStepChange={setOnboardingStep}
          state={onboardingState}
          onStateChange={(next) => setOnboardingState((previous) => ({ ...previous, ...next }))}
          onCompleted={() => setScreen('RiderDashboard')}
        />
      ) : null}

      {screen === 'RiderDashboard' ? (
        <View style={styles.dashboardWrap}>
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.headline}>Rider dashboard</Text>
              <Text style={styles.subhead}>Protected week for {onboardingState.phone ?? 'rider'}</Text>
            </View>
            <Pressable onPress={() => setScreen('AdminDashboard')} style={styles.adminButton}>
              <Text style={styles.adminButtonText}>Open Admin</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {policyData && riderTab === 'home' ? (
              <>
                <PolicyStatusCard policy={policyData.policy} weekProgress={policyData.week_progress} nextPremium={policyData.next_premium} />
                <TriggerMonitor triggers={policyData.trigger_statuses} />
                {claims[0] ? <PayoutHistory riderId={onboardingState.riderId ?? '-'} claims={claims.slice(0, 1)} totalThisWeek={totalThisWeek} /> : null}
              </>
            ) : null}

            {riderTab === 'history' ? <PayoutHistory riderId={onboardingState.riderId ?? '-'} claims={claims} totalThisWeek={totalThisWeek} /> : null}

            {policyData && riderTab === 'policy' ? (
              <View style={styles.policyPanel}>
                <Text style={styles.policyTitle}>Coverage summary</Text>
                <Text style={styles.policyLine}>Policy: {policyData.policy.policy_id}</Text>
                <Text style={styles.policyLine}>Week: {policyData.policy.week_start.slice(0, 10)} to {policyData.policy.week_end.slice(0, 10)}</Text>
                <Text style={styles.policyLine}>Next premium: {paiseToInr(policyData.next_premium)}</Text>
                <Text style={styles.policyLine}>UPI: {onboardingState.upiId ?? 'not linked'}</Text>
              </View>
            ) : null}
          </ScrollView>

          <BottomNav active={riderTab} onNavigate={setRiderTab} />
        </View>
      ) : null}

      {screen === 'AdminDashboard' ? (
        <View style={styles.dashboardWrap}>
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.headline}>Admin dashboard</Text>
              <Text style={styles.subhead}>Live portfolio and fraud controls</Text>
            </View>
            <Pressable onPress={() => setScreen('RiderDashboard')} style={styles.adminButton}>
              <Text style={styles.adminButtonText}>Back to Rider</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.adminStatsRow}>
              <StatCard label="Active policies" value={String(portfolioStats?.active_policies ?? 0)} />
              <StatCard label="Loss ratio" value={String(portfolioStats?.loss_ratio ?? 0)} />
              <StatCard label="Weekly payouts" value={paiseToInr(portfolioStats?.weekly_payouts_paise ?? 0)} />
              <StatCard label="Fraud queue" value={String(portfolioStats?.fraud_queue_size ?? 0)} />
            </View>

            <View style={styles.adminPanel}>
              <Text style={styles.policyTitle}>Fraud queue</Text>
              {fraudQueue.map((item) => (
                <View key={item.id} style={styles.queueRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.queueTitle}>{item.trigger_type.toUpperCase()} · {item.rider_id}</Text>
                    <Text style={styles.queueMeta}>Score {item.fraud_score.toFixed(2)} · {item.flag_reason}</Text>
                  </View>
                  <Pressable
                    style={[styles.queueAction, styles.approveAction]}
                    onPress={async () => {
                      await approveClaim(item.id, 'Approved in admin dashboard');
                      setFraudQueue((prev) => prev.filter((q) => q.id !== item.id));
                    }}
                  >
                    <Text style={styles.queueActionText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.queueAction, styles.rejectAction]}
                    onPress={async () => {
                      await rejectClaim(item.id, 'Rejected in admin dashboard');
                      setFraudQueue((prev) => prev.filter((q) => q.id !== item.id));
                    }}
                  >
                    <Text style={styles.queueActionText}>Reject</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.adminPanel}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.policyTitle}>Live trigger events</Text>
                <Pressable
                  style={styles.adminButton}
                  onPress={async () => {
                    await fireDemoTrigger({ pin_code: onboardingState.pinCode ?? '600042', trigger_type: 'rain' });
                  }}
                >
                  <Text style={styles.adminButtonText}>Fire Demo Trigger</Text>
                </Pressable>
              </View>

              {triggerEvents.map((event) => (
                <View key={event.event_id} style={styles.queueRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.queueTitle}>{event.trigger_type.toUpperCase()} · {event.zone}</Text>
                    <Text style={styles.queueMeta}>Metric {event.metric} · Status {event.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  dashboardWrap: { flex: 1, paddingTop: 48, backgroundColor: colors.paper },
  dashboardHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headline: { fontSize: 24, fontWeight: '800', color: colors.ink2 },
  subhead: { fontSize: 12, color: colors.muted },
  adminButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  adminButtonText: { color: colors.ink2, fontSize: 11, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  policyPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 14,
    gap: 6,
  },
  policyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  policyLine: { fontSize: 12, color: colors.muted },
  adminStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flexGrow: 1,
    minWidth: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    padding: 10,
  },
  statLabel: { color: colors.muted, fontSize: 11 },
  statValue: { color: colors.ink2, fontSize: 16, fontWeight: '800' },
  adminPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 12,
    gap: 8,
  },
  queueRow: {
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: 8,
    backgroundColor: colors.paper,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueTitle: { color: colors.ink2, fontSize: 12, fontWeight: '700' },
  queueMeta: { color: colors.muted, fontSize: 11 },
  queueAction: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  approveAction: { backgroundColor: colors.teal },
  rejectAction: { backgroundColor: colors.coral },
  queueActionText: { color: colors.white, fontWeight: '700', fontSize: 10 },
});
