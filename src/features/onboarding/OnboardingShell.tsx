import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { calculatePremium } from '../../api/premiumClient';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { Toast } from '../../components/ui/Toast';
import { updateRiderProfile } from '../../api/ridersClient';
import { setAuthSession } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { AuthChoiceStep } from './AuthChoiceStep';
import { RiderLoginStep } from './RiderLoginStep';

type OnboardingShellProps = {
  step: 1 | 1.5 | 1.75 | 2 | 3 | 4 | 5;
  onStepChange: (step: 1 | 1.5 | 1.75 | 2 | 3 | 4 | 5) => void;
  state: OnboardingState;
  onStateChange: (next: Partial<OnboardingState>) => void;
  onCompleted: () => void;
};

export function OnboardingShell({ step, onStepChange, state, onStateChange, onCompleted }: OnboardingShellProps) {
  const [error, setError] = useState<string | null>(null);
  const [isCalculatingPremium, setIsCalculatingPremium] = useState(false);

  const progressLabel = useMemo(() => {
    if (step === 1) return '1 / 5';
    if (step === 1.5) return '1 / 5';
    if (step === 1.75) return '1 / 5';
    return `${Math.floor(step)} / 5`;
  }, [step]);

  const goNext = (next: 1 | 1.5 | 1.75 | 2 | 3 | 4 | 5) => {
    setError(null);
    onStepChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.badge}>RIDER ONBOARDING</Text>
        <Text style={styles.heading}>EarnSecure</Text>
        <Text style={styles.subheading}>No forms. No waiting. Just protection.</Text>
        <Text style={styles.progress}>Step {progressLabel}</Text>
      </View>

      <View style={styles.card}>
        {step === 1 ? (
          <PhoneOTPStep
            onVerified={(payload) => {
              setAuthSession(payload.jwt, payload.riderId);
              onStateChange({
                phone: payload.phone,
                token: payload.jwt,
                riderId: payload.riderId,
              });
              goNext(1.5);
            }}
          />
        ) : null}

        {step === 1.5 ? (
          <AuthChoiceStep
            onChooseLogin={() => goNext(1.75)}
            onChooseSignup={() => goNext(2)}
          />
        ) : null}

        {step === 1.75 ? (
          <RiderLoginStep
            phone={state.phone!}
            onLogin={(payload) => {
              setAuthSession(payload.jwt, payload.riderId);
              onStateChange({
                token: payload.jwt,
                riderId: payload.riderId,
              });
              onCompleted(); // Skip onboarding for existing users
            }}
            onSwitchToSignup={() => goNext(2)}
          />
        ) : null}

        {step === 2 && state.riderId ? (
          <PlatformLinkStep
            riderId={state.riderId}
            onLinked={(platform, platformRiderId, activitySummary) => {
              onStateChange({
                platform,
                platformRiderId,
                activitySummary,
              });
              goNext(3);
            }}
          />
        ) : null}

        {step === 3 && state.riderId && !isCalculatingPremium ? (
          <ZoneShiftStep
            onSelected={async (pinCode, zones, shiftWindows) => {
              try {
                setIsCalculatingPremium(true);
                await updateRiderProfile({
                  rider_id: state.riderId!,
                  pin_code: pinCode,
                  zones,
                  shift_windows: shiftWindows,
                });
                onStateChange({ pinCode, zones, shiftWindows });
                const premium = await calculatePremium(state.riderId!);
                onStateChange({
                  premiumPaise: premium.premium_paise,
                  premiumModelInputs: premium.model_inputs,
                  covers: premium.covers,
                });
                goNext(4);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to save profile.');
              } finally {
                setIsCalculatingPremium(false);
              }
            }}
          />
        ) : null}

        {step === 3 && isCalculatingPremium ? (
          <>
            <Toast message="Calculating your premium from live profile signals..." variant="info" />
            <SkeletonLoader lines={5} />
          </>
        ) : null}

        {step === 4 && state.premiumPaise !== undefined ? (
          <PremiumRevealStep
            premium={state.premiumPaise}
            modelInputs={state.premiumModelInputs ?? {}}
            covers={state.covers ?? []}
            onAccept={() => goNext(5)}
          />
        ) : null}

        {step === 5 && state.riderId && state.premiumPaise !== undefined ? (
          <UPIActivateStep
            riderId={state.riderId}
            premiumPaise={state.premiumPaise}
            onActivated={(policyId, upiId) => {
              onStateChange({ policyId, upiId });
              onCompleted();
            }}
          />
        ) : null}

        {error ? <Toast message={error} variant="error" onClose={() => setError(null)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ink2, padding: 16, paddingTop: 56, gap: 14 },
  header: { gap: 4 },
  badge: {
    alignSelf: 'flex-start',
    color: colors.teal,
    borderColor: '#1f6d56',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  heading: { fontSize: 30, fontWeight: '800', color: colors.white },
  subheading: { color: '#A9A79E', fontSize: 13 },
  progress: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  card: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
});
