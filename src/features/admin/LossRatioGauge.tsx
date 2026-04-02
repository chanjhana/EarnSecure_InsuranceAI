import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

type LossRatioGaugeProps = {
  ratio: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function LossRatioGauge({ ratio }: LossRatioGaugeProps) {
  const normalized = clamp(ratio, 0, 1);
  const markerLeftPercent = normalized * 100;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Loss ratio</Text>
        <Text style={styles.value}>{normalized.toFixed(2)}</Text>
      </View>

      <View style={styles.gaugeTrack}>
        <View style={styles.targetBand} />
        <View style={[styles.marker, { left: `${markerLeftPercent}%` }]} />
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>0.0</Text>
        <Text style={styles.scaleText}>Target 0.6-0.8</Text>
        <Text style={styles.scaleText}>1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  value: { color: colors.ink2, fontSize: 18, fontWeight: '800' },
  gaugeTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.paper2,
    position: 'relative',
    overflow: 'hidden',
  },
  targetBand: {
    position: 'absolute',
    left: '60%',
    width: '20%',
    top: 0,
    bottom: 0,
    backgroundColor: '#BFEFD6',
  },
  marker: {
    position: 'absolute',
    width: 4,
    top: -3,
    bottom: -3,
    borderRadius: 3,
    backgroundColor: colors.tealDark,
    marginLeft: -2,
  },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { fontSize: 10, color: colors.muted },
});
