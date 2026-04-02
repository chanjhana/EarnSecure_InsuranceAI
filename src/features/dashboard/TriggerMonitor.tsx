import { StyleSheet, Text, View } from 'react-native';

import { TriggerStatus } from '../../api/policiesClient';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { colors } from '../../theme/colors';
import { formatDateTime } from '../../utils/date';

type TriggerMonitorProps = { triggers: TriggerStatus[]; refreshInterval?: number };

export function TriggerMonitor({ triggers, refreshInterval = 15 * 60 * 1000 }: TriggerMonitorProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Trigger monitor</Text>
      <Text style={styles.subtitle}>Checks every {Math.round(refreshInterval / 60000)} min</Text>

      {triggers.map((trigger) => (
        <View key={trigger.trigger_type} style={styles.row}>
          <View>
            <Text style={styles.triggerName}>{trigger.trigger_type.toUpperCase()}</Text>
            <Text style={styles.triggerMeta}>{trigger.threshold_label}</Text>
            {trigger.last_checked_at ? <Text style={styles.triggerMeta}>Last check: {formatDateTime(trigger.last_checked_at)}</Text> : null}
          </View>
          <StatusBadge
            status={trigger.state === 'fired' ? 'paid' : trigger.is_armed ? 'active' : 'hold'}
            label={trigger.state === 'fired' ? 'FIRED' : trigger.is_armed ? 'ARMED' : 'IDLE'}
            dot={trigger.is_armed}
          />
        </View>
      ))}
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
    gap: 10,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  subtitle: { fontSize: 11, color: colors.muted },
  row: {
    borderWidth: 1,
    borderColor: colors.paper3,
    backgroundColor: colors.paper,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerName: { fontSize: 12, color: colors.ink2, fontWeight: '700' },
  triggerMeta: { fontSize: 11, color: colors.muted },
});
