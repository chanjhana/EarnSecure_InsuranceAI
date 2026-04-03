import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Policy } from '../../api/policiesClient';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';

type PolicyStatusCardProps = { policy: Policy; weekProgress: number; nextPremium: number };

export function PolicyStatusCard({ policy, weekProgress, nextPremium }: PolicyStatusCardProps) {
  const progressPercent = Math.round(weekProgress * 100);

  return (
    <LinearGradient colors={['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.4)']} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Policy status</Text>
        <StatusBadge status={policy.status === 'active' ? 'active' : 'hold'} label={policy.status.toUpperCase()} />
      </View>

      <Text style={styles.value}>{paiseToInr(nextPremium)}</Text>
      <Text style={styles.subtitle}>Next weekly debit</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.meta}>Week progress: {progressPercent}%</Text>
      <Text style={styles.meta}>Ends: {formatDateTime(policy.week_end)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    gap: 8,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 13, color: colors.ink2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 38, fontWeight: '900', color: colors.teal, textShadowColor: 'rgba(20, 241, 149, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  subtitle: { fontSize: 12, color: colors.ink3 },
  progressTrack: { height: 10, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.4)', overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: colors.teal, shadowColor: colors.teal, shadowOpacity: 1, shadowRadius: 10 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
