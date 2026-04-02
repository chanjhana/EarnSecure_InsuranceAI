import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';

type ZoneShiftStepProps = {
  onSelected: (pinCode: string, shift: 'morning' | 'afternoon' | 'evening' | 'night') => void;
  suggestedZones?: string[];
};

const shifts: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night'];

export function ZoneShiftStep({ onSelected, suggestedZones = ['Velachery', 'Adyar', 'Tambaram', 'OMR'] }: ZoneShiftStepProps) {
  const [pinCode, setPinCode] = useState('');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [selectedZone, setSelectedZone] = useState(suggestedZones[0]);

  const canContinue = useMemo(() => /^\d{6}$/.test(pinCode), [pinCode]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where do you usually ride?</Text>
      <Text style={styles.subtitle}>Zone and shift are used to price your weekly premium.</Text>

      <Text style={styles.label}>Pin code</Text>
      <TextInput
        value={pinCode}
        onChangeText={(value) => setPinCode(value.replace(/\D/g, '').slice(0, 6))}
        style={styles.input}
        placeholder="600042"
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Suggested zones</Text>
      <View style={styles.chipGrid}>
        {suggestedZones.map((zone) => (
          <Pressable key={zone} style={[styles.chip, selectedZone === zone ? styles.chipSelected : null]} onPress={() => setSelectedZone(zone)}>
            <Text style={[styles.chipText, selectedZone === zone ? styles.chipTextSelected : null]}>{zone}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Usual shift</Text>
      <View style={styles.chipGrid}>
        {shifts.map((item) => (
          <Pressable key={item} style={[styles.chip, shift === item ? styles.chipSelected : null]} onPress={() => setShift(item)}>
            <Text style={[styles.chipText, shift === item ? styles.chipTextSelected : null]}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.helper}>Selected zone: {selectedZone}</Text>
      <PrimaryButton label="Continue" onPress={() => onSelected(pinCode, shift)} disabled={!canContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 12 },
  label: { fontSize: 11, fontWeight: '600', color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: colors.white,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.paper2,
  },
  chipSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealLight,
  },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  chipTextSelected: { color: colors.tealDark },
  helper: { fontSize: 11, color: colors.muted },
});
