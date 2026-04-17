import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getZones } from '../../api/ridersClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';

type ZoneShiftStepProps = {
  onSelected: (pinCode: string, zones: string[], shifts: ('morning' | 'afternoon' | 'evening' | 'night')[]) => void;
};

const shifts: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night'];

export function ZoneShiftStep({ onSelected }: ZoneShiftStepProps) {
  const [pinCode, setPinCode] = useState('');
  const [zones, setZones] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<('morning' | 'afternoon' | 'evening' | 'night')[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const canContinue = useMemo(() => /^\d{6}$/.test(pinCode) && selectedZones.length > 0 && selectedShifts.length > 0, [pinCode, selectedZones, selectedShifts]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!/^\d{6}$/.test(pinCode)) {
        setZones([]);
        setSelectedZones([]);
        setZoneError(null);
        return;
      }

      setLoadingZones(true);
      setZoneError(null);
      try {
        const result = await getZones(pinCode);
        if (!active) return;
        setZones(result.zones);
        setSelectedZones([]);
      } catch (err) {
        if (!active) return;
        setZones([]);
        setSelectedZones([]);
        setZoneError(err instanceof Error ? err.message : 'Unable to load zones.');
      } finally {
        if (active) {
          setLoadingZones(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [pinCode]);

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) => prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]);
  };

  const toggleShift = (shift: 'morning' | 'afternoon' | 'evening' | 'night') => {
    setSelectedShifts((prev) => prev.includes(shift) ? prev.filter((s) => s !== shift) : [...prev, shift]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where do you usually ride?</Text>
      {/* Added Traffic mention to the UI */}
      <Text style={styles.subtitle}>Zone, shift, and historical traffic patterns are used to price your weekly premium.</Text>

      <Text style={styles.label}>Pin code</Text>
      <TextInput
        value={pinCode}
        onChangeText={(value) => setPinCode(value.replace(/\D/g, '').slice(0, 6))}
        style={styles.input}
        placeholder="641659"
        keyboardType="number-pad"
      />

      {loadingZones && <Text style={styles.loading}>Searching localities for pincode...</Text>}

      {zones.length > 0 && (
        <>
          <Text style={styles.label}>Select your localities (Zones)</Text>
          <View style={styles.chipGrid}>
            {zones.map((zone) => (
              <Pressable key={zone} style={[styles.chip, selectedZones.includes(zone) ? styles.chipSelected : null]} onPress={() => toggleZone(zone)}>
                <Text style={[styles.chipText, selectedZones.includes(zone) ? styles.chipTextSelected : null]}>{zone}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/^\d{6}$/.test(pinCode) && zones.length === 0 && !loadingZones ? (
        <Text style={styles.error}>{zoneError ?? 'No localities found for this pin code.'}</Text>
      ) : null}

      <Text style={styles.label}>Select shifts</Text>
      <View style={styles.chipGrid}>
        {shifts.map((shift) => (
          <Pressable key={shift} style={[styles.chip, selectedShifts.includes(shift) ? styles.chipSelected : null]} onPress={() => toggleShift(shift)}>
            <Text style={[styles.chipText, selectedShifts.includes(shift) ? styles.chipTextSelected : null]}>{shift.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.helper}>Selected zones: {selectedZones.join(', ')} | Shifts: {selectedShifts.join(', ')}</Text>
      <PrimaryButton label="Continue" onPress={() => onSelected(pinCode, selectedZones, selectedShifts)} disabled={!canContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 12 },
  label: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 4 },
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
  loading: { fontSize: 11, color: colors.teal, fontStyle: 'italic' },
  error: { fontSize: 11, color: colors.coral },
});