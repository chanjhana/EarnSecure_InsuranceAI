import { StyleSheet, Text, View } from 'react-native';

import { Claim } from '../../api/claimsClient';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';
import { PayoutCard } from './PayoutCard';

type PayoutHistoryProps = { riderId: string; claims: Claim[]; totalThisWeek: number };

export function PayoutHistory({ riderId, claims, totalThisWeek }: PayoutHistoryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payout history</Text>
          <Text style={styles.sub}>Rider: {riderId}</Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>This week</Text>
          <Text style={styles.totalValue}>{paiseToInr(totalThisWeek)}</Text>
        </View>
      </View>

      {claims.length ? (
        claims.map((claim, index) => (
          <PayoutCard
            key={claim.id}
            claim={claim}
            expanded={index === 0}
            showVerifications={index === 0 && claim.status === 'paid'}
          />
        ))
      ) : (
        <Text style={styles.empty}>No payouts yet this week.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink2 },
  sub: { fontSize: 11, color: colors.muted },
  totalCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.tealLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  totalLabel: { fontSize: 10, color: colors.tealDark },
  totalValue: { fontSize: 14, fontWeight: '700', color: colors.tealDark },
  empty: { paddingVertical: 18, color: colors.muted, textAlign: 'center' },
});
