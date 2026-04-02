import { StyleSheet, Text, View } from 'react-native';

import { PortfolioStats as PortfolioStatsType } from '../../api/adminClient';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';
import { LossRatioGauge } from './LossRatioGauge';

type PortfolioStatsProps = {
  stats: PortfolioStatsType | null;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

export function PortfolioStats({ stats }: PortfolioStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <StatTile label="Active policies" value={String(stats?.active_policies ?? 0)} />
        <StatTile label="Weekly payouts" value={paiseToInr(stats?.weekly_payouts_paise ?? 0)} />
        <StatTile label="Fraud queue" value={String(stats?.fraud_queue_size ?? 0)} />
      </View>
      <LossRatioGauge ratio={stats?.loss_ratio ?? 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    minWidth: '31%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    padding: 10,
  },
  tileLabel: { color: colors.muted, fontSize: 11 },
  tileValue: { color: colors.ink2, fontSize: 16, fontWeight: '800' },
});
