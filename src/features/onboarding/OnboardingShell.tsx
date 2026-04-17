import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { calculatePremium } from '../../api/premiumClient';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { Toast } from '../../components/ui/Toast';
import { updateRiderProfile } from '../../api/ridersClient';
import { setAuthSession } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { AuthChoiceStep } from './AuthChoiceStep';
import { PhoneOTPStep } from './PhoneOTPStep';
import { PlatformLinkStep } from './PlatformLinkStep';
import { PremiumRevealStep } from './PremiumRevealStep';
import { RiderLoginStep } from './RiderLoginStep';
import { UPIActivateStep } from './UPIActivateStep';
import { ZoneShiftStep } from './ZoneShiftStep';
import { OnboardingState } from './types';

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
    <LinearGradient colors={['#030712', '#0A1224', '#030712']} style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
           <Image source={require('../../../assets/earnsecure_logo.png')} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
           <Text style={styles.heading}>EarnSecure</Text>
        </View>
        <Text style={styles.badge}>RIDER ONBOARDING</Text>
        <Text style={styles.subheading}>No forms. No waiting. Just protection.</Text>
        <Text style={styles.progress}>Step {progressLabel}</Text>
      </View>

      <View style={styles.card}>
        {/* Restored AuthChoiceStep to act as the true entrypoint */}
        {step === 1 ? (
          <AuthChoiceStep
            onChooseLogin={() => goNext(1.75)}
            onChooseSignup={() => goNext(1.5)}
          />
        ) : null}

        {/* Mapped PhoneOTPStep to Step 1.5 */}
        {step === 1.5 ? (
          <PhoneOTPStep
            onVerified={(payload) => {
              setAuthSession(payload.jwt, payload.riderId);
              onStateChange({
                phone: payload.phone,
                token: payload.jwt,
                riderId: payload.riderId,
              });
              goNext(2);
            }}
            onSwitchToLogin={() => goNext(1.75)}
          />
        ) : null}

        {/* Existing RiderLoginStep mapped cleanly to Step 1.75 */}
        {step === 1.75 ? (
          <RiderLoginStep
            phone={state.phone}
            onLogin={(payload) => {
              setAuthSession(payload.jwt, payload.riderId);
              onStateChange({
                token: payload.jwt,
                riderId: payload.riderId,
              });
              onCompleted(); // Skip onboarding for existing users
            }}
            onSwitchToSignup={() => goNext(1.5)}
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
                const premium = await calculatePremium({
                  rider_id: state.riderId!,
                  pin_code: pinCode,
                  shift_windows: shiftWindows,
                  zones,
                });
                onStateChange({
                  premiumPaise: premium.weekly_premium_paise,
                  premiumModelInputs: premium as any, // pass full object for breakdown
                  covers: [], // Covers omitted from response as requested
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
            modelInputs={(state.premiumModelInputs as any) ?? ({} as any)}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, paddingTop: 56, gap: 14 },
  header: { gap: 4 },
  badge: {
    alignSelf: 'flex-start',
    color: colors.teal,
    borderColor: colors.tealLight,
    backgroundColor: 'rgba(20, 241, 149, 0.05)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heading: { fontSize: 32, fontWeight: '900', color: colors.ink, textShadowColor: 'rgba(20, 241, 149, 0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  subheading: { color: colors.ink3, fontSize: 13, letterSpacing: 0.5 },
  progress: { color: colors.teal, fontSize: 13, fontWeight: '800' },
  card: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
});
