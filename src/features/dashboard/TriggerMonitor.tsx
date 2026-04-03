import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { TriggerStatus } from '../../api/policiesClient';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { colors } from '../../theme/colors';
import { formatDateTime } from '../../utils/date';

type TriggerMonitorProps = { triggers: TriggerStatus[]; refreshInterval?: number };

export function TriggerMonitor({ triggers, refreshInterval = 15 * 60 * 1000 }: TriggerMonitorProps) {
  return (
    <LinearGradient colors={['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.4)']} style={styles.card}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  row: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerName: { fontSize: 13, color: colors.ink2, fontWeight: '700', letterSpacing: 0.5 },
  triggerMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
