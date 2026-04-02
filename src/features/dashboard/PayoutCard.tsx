import { StyleSheet, Text, View } from 'react-native';

import { Claim } from '../../api/claimsClient';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';

type PayoutCardProps = { claim: Claim; showVerifications?: boolean; expanded?: boolean };

export function PayoutCard({ claim, showVerifications = false, expanded = false }: PayoutCardProps) {
  const badgeStatus = claim.status === 'held' ? 'hold' : claim.status === 'rejected' ? 'rejected' : 'paid';

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View>
          <Text style={styles.trigger}>{claim.trigger_type.toUpperCase()} trigger</Text>
          <Text style={styles.date}>{formatDateTime(claim.created_at)}</Text>
        </View>
        <StatusBadge status={badgeStatus} label={claim.status.toUpperCase()} />
      </View>

      <Text style={styles.amount}>{paiseToInr(claim.amount_paise)}</Text>

      {showVerifications && expanded ? (
        <View style={styles.verifications}>
          <View style={styles.verificationChip}><Text style={styles.verificationText}>[OK] Platform activity</Text></View>
          <View style={styles.verificationChip}><Text style={styles.verificationText}>[OK] Order drop</Text></View>
          <View style={styles.verificationChip}><Text style={styles.verificationText}>[OK] GPS zone</Text></View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    padding: 12,
    gap: 8,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trigger: { fontSize: 12, fontWeight: '700', color: colors.ink2 },
  date: { fontSize: 11, color: colors.muted },
  amount: { fontSize: 24, fontWeight: '800', color: colors.teal },
  verifications: { borderTopWidth: 1, borderTopColor: colors.paper3, paddingTop: 8, gap: 6 },
  verificationChip: {
    borderWidth: 1,
    borderColor: '#9FDCC6',
    borderRadius: 6,
    backgroundColor: colors.tealLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verificationText: { fontSize: 11, color: colors.tealDark, fontWeight: '700' },
});
