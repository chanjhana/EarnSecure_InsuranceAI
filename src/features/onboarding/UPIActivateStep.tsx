import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { activatePolicy } from '../../api/policiesClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';
import { isValidUpiId } from '../../utils/validators';

type UPIActivateStepProps = {
  riderId: string;
  premiumPaise: number;
  onActivated: (policyId: string, upiId: string) => void;
  razorpayKey?: string;
};

export function UPIActivateStep({ riderId, premiumPaise, onActivated }: UPIActivateStepProps) {
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canActivate = useMemo(() => isValidUpiId(upiId), [upiId]);

  const handleActivate = async () => {
    if (!canActivate) {
      setError('Enter a valid UPI ID.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const policy = await activatePolicy(riderId, upiId.trim());
      onActivated(policy.policy_id, upiId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to activate policy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where should we send payouts?</Text>
      <Text style={styles.subtitle}>Weekly premium: {paiseToInr(premiumPaise)}</Text>

      <Text style={styles.label}>UPI ID</Text>
      <TextInput value={upiId} onChangeText={setUpiId} style={styles.input} placeholder="ravi.kumar@upi" autoCapitalize="none" />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Pay and Activate" onPress={handleActivate} loading={loading} disabled={!canActivate} />

      <Text style={styles.helper}>Activation schedules Monday debit and enables automatic payouts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted },
  label: { fontSize: 11, fontWeight: '600', color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: colors.white,
  },
  error: { color: colors.coral, fontSize: 12 },
  helper: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
