import { StyleSheet, Text, View } from 'react-native';

import { Policy } from '../../api/policiesClient';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';

type PolicyStatusCardProps = { policy: Policy; weekProgress: number; nextPremium: number };

export function PolicyStatusCard({ policy, weekProgress, nextPremium }: PolicyStatusCardProps) {
  const progressPercent = Math.round(weekProgress * 100);

  return (
    <View style={styles.card}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 14,
    gap: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  value: { fontSize: 30, fontWeight: '800', color: colors.teal },
  subtitle: { fontSize: 11, color: colors.muted },
  progressTrack: { height: 8, borderRadius: 99, backgroundColor: colors.paper2, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: colors.teal },
  meta: { color: colors.muted, fontSize: 11 },
});
