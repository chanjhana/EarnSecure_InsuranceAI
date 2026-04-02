import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { calculatePremium } from '../../api/premiumClient';
import { updateRiderProfile } from '../../api/ridersClient';
import { setAuthSession } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { PlatformLinkStep } from './PlatformLinkStep';
import { PhoneOTPStep } from './PhoneOTPStep';
import { PremiumRevealStep } from './PremiumRevealStep';
import { UPIActivateStep } from './UPIActivateStep';
import { OnboardingState } from './types';
import { ZoneShiftStep } from './ZoneShiftStep';

type OnboardingShellProps = {
  step: 1 | 2 | 3 | 4 | 5;
  onStepChange: (step: 1 | 2 | 3 | 4 | 5) => void;
  state: OnboardingState;
  onStateChange: (next: Partial<OnboardingState>) => void;
  onCompleted: () => void;
};

export function OnboardingShell({ step, onStepChange, state, onStateChange, onCompleted }: OnboardingShellProps) {
  const [error, setError] = useState<string | null>(null);

  const progressLabel = useMemo(() => `${step} / 5`, [step]);

  const goNext = (next: 1 | 2 | 3 | 4 | 5) => {
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
              goNext(2);
            }}
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

        {step === 3 && state.riderId ? (
          <ZoneShiftStep
            suggestedZones={state.activitySummary?.zones ?? ['Velachery', 'Adyar', 'Tambaram', 'OMR']}
            onSelected={async (pinCode, shiftWindow) => {
              try {
                await updateRiderProfile({
                  rider_id: state.riderId!,
                  pin_code: pinCode,
                  shift_window: shiftWindow,
                });
                onStateChange({ pinCode, shiftWindow });
                const premium = await calculatePremium(state.riderId!);
                onStateChange({
                  premiumPaise: premium.premium_paise,
                  premiumModelInputs: premium.model_inputs,
                  covers: premium.covers,
                });
                goNext(4);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to save profile.');
              }
            }}
          />
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

        {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: { color: colors.coral, marginTop: 8, fontSize: 12 },
});
