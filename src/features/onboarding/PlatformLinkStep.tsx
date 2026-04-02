import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Platform, linkPlatform } from '../../api/ridersClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';

type PlatformLinkStepProps = {
  riderId: string;
  onLinked: (platform: Platform, riderId: string, activitySummary: { d30_orders: number; avg_daily: number; zones: string[] }) => void;
  platforms?: Platform[];
};

export function PlatformLinkStep({ riderId, onLinked, platforms = ['swiggy', 'zomato'] }: PlatformLinkStepProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('swiggy');
  const [platformRiderId, setPlatformRiderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => platformRiderId.trim().length >= 5, [platformRiderId]);

  const handleVerify = async () => {
    if (!canContinue) {
      setError('Enter your platform rider ID to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await linkPlatform({
        platform: selectedPlatform,
        rider_id: riderId,
      });
      if (!result.valid) {
        setError('Platform verification failed. Try another ID.');
        return;
      }
      onLinked(selectedPlatform, platformRiderId.trim(), result.activity_summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to link platform.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which platform do you ride for?</Text>
      <Text style={styles.subtitle}>We use this to verify active status and order history.</Text>

      <View style={styles.platformRow}>
        {platforms.map((platform) => (
          <Pressable
            key={platform}
            style={[styles.platformCard, selectedPlatform === platform ? styles.platformCardSelected : null]}
            onPress={() => setSelectedPlatform(platform)}
          >
            <Text style={styles.platformLabel}>{platform.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Your Rider ID</Text>
      <TextInput
        value={platformRiderId}
        onChangeText={setPlatformRiderId}
        placeholder="SWG-CHN-291847"
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Verify and Continue" onPress={handleVerify} loading={loading} disabled={!canContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted },
  platformRow: { flexDirection: 'row', gap: 8 },
  platformCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  platformCardSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealLight,
  },
  platformLabel: { color: colors.ink2, fontWeight: '700' },
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
});
