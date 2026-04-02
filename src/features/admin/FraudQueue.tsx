import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FraudQueueItem } from '../../api/adminClient';
import { colors } from '../../theme/colors';

type FraudQueueProps = {
  items: FraudQueueItem[];
  onApprove: (item: FraudQueueItem) => void;
  onReject: (item: FraudQueueItem) => void;
};

export function FraudQueue({ items, onApprove, onReject }: FraudQueueProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Fraud queue</Text>
      {items.length === 0 ? <Text style={styles.empty}>No cases in review.</Text> : null}

      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.trigger_type.toUpperCase()} · {item.rider_id}</Text>
            <Text style={styles.rowMeta}>Score {item.fraud_score.toFixed(2)} · {item.flag_reason}</Text>
          </View>

          <Pressable style={[styles.action, styles.approve]} onPress={() => onApprove(item)}>
            <Text style={styles.actionText}>Approve</Text>
          </Pressable>
          <Pressable style={[styles.action, styles.reject]} onPress={() => onReject(item)}>
            <Text style={styles.actionText}>Reject</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 12,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  empty: { color: colors.muted, fontSize: 12 },
  row: {
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: 8,
    backgroundColor: colors.paper,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: { color: colors.ink2, fontSize: 12, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 11 },
  action: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  approve: { backgroundColor: colors.teal },
  reject: { backgroundColor: colors.coral },
  actionText: { color: colors.white, fontWeight: '700', fontSize: 10 },
});
