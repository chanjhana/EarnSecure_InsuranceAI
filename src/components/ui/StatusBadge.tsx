import { StyleSheet, Text, View } from 'react-native';

type StatusBadgeProps = {
  status: 'active' | 'paid' | 'hold' | 'rejected';
  label?: string;
  dot?: boolean;
};

export function StatusBadge({ status, label, dot = false }: StatusBadgeProps) {
  // TODO: Add pulse animation for live trigger states.
  return (
    <View style={[styles.base, statusStyles[status]]}>
      {dot ? <View style={styles.dot} /> : null}
      <Text style={styles.text}>{label ?? status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 6 },
  text: { fontSize: 11, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: '#0D9E74' },
});

const statusStyles = StyleSheet.create({
  active: { backgroundColor: '#E6F7F1' },
  paid: { backgroundColor: '#E8F4FF' },
  hold: { backgroundColor: '#FDF4E3' },
  rejected: { backgroundColor: '#FDECEA' },
});
