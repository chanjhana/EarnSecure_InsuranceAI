import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TriggerEvent } from '../../api/adminClient';
import { colors } from '../../theme/colors';

type TriggerEventTableProps = {
  events: TriggerEvent[];
  onFireDemoTrigger: () => void;
};

export function TriggerEventTable({ events, onFireDemoTrigger }: TriggerEventTableProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Live trigger events</Text>
        <Pressable style={styles.fireButton} onPress={onFireDemoTrigger}>
          <Text style={styles.fireButtonText}>Fire Demo Trigger</Text>
        </Pressable>
      </View>

      {events.length === 0 ? <Text style={styles.empty}>No active trigger events.</Text> : null}

      {events.map((event) => (
        <View key={event.event_id} style={styles.row}>
          <View style={styles.cellWide}>
            <Text style={styles.rowTitle}>{event.trigger_type.toUpperCase()} · {event.zone}</Text>
            <Text style={styles.rowMeta}>Status {event.status.toUpperCase()}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.metricLabel}>Metric</Text>
            <Text style={styles.metricValue}>{event.metric.toFixed(1)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.metricLabel}>Affected</Text>
            <Text style={styles.metricValue}>{event.affected_riders}</Text>
          </View>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  fireButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fireButtonText: { color: colors.ink2, fontSize: 11, fontWeight: '700' },
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
  cellWide: { flex: 1 },
  cell: {
    width: 70,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 8,
  },
  rowTitle: { color: colors.ink2, fontSize: 12, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 11 },
  metricLabel: { color: colors.muted, fontSize: 10 },
  metricValue: { color: colors.ink2, fontSize: 12, fontWeight: '700' },
});
