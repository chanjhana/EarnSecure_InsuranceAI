import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getClaims } from '../api/claimsClient';
import { Claim } from '../api/claimsClient';
import { getCurrentPolicy } from '../api/policiesClient';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { AdminLogin } from '../features/admin/AdminLogin';
import { BottomNav } from '../features/dashboard/BottomNav';
import { PayoutHistory } from '../features/dashboard/PayoutHistory';
import { PolicyStatusCard } from '../features/dashboard/PolicyStatusCard';
import { TriggerMonitor } from '../features/dashboard/TriggerMonitor';
import { OnboardingShell } from '../features/onboarding/OnboardingShell';
import { OnboardingState } from '../features/onboarding/types';
import { colors } from '../theme/colors';
import { paiseToInr } from '../utils/currency';
import { RootScreen, RiderTab } from './routes';

export function AppNavigator() {
  const [screen, setScreen] = useState<RootScreen>('Onboarding');
  const [onboardingStep, setOnboardingStep] = useState<1 | 1.5 | 1.75 | 2 | 3 | 4 | 5>(1);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({});
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const [riderTab, setRiderTab] = useState<RiderTab>('home');
  const [policyData, setPolicyData] = useState<Awaited<ReturnType<typeof getCurrentPolicy>> | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setScreen('AdminDashboard');
    }
  }, []);

  useEffect(() => {
    if (screen !== 'RiderDashboard' || !onboardingState.riderId) return;

    const load = async () => {
      const [policy, riderClaims] = await Promise.all([getCurrentPolicy(onboardingState.riderId!), getClaims(onboardingState.riderId!)]);
      setPolicyData(policy);
      setClaims(riderClaims);
    };

    load().catch(() => null);
  }, [screen, onboardingState.riderId]);

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
        adminToken ? (
          <AdminDashboard
            defaultPinCode={onboardingState.pinCode ?? '600042'}
            onBackToRider={() => setScreen('RiderDashboard')}
          />
        ) : (
          <AdminLogin onLogin={setAdminToken} />
        )
      ) : null}
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
});
