import { StyleSheet, Text, TextInput, View } from 'react-native';

type OTPInputProps = { value: string; onChangeText: (text: string) => void };

export function OTPInput({ value, onChangeText }: OTPInputProps) {
  // TODO: Only accept 6 digits and auto-advance when complete.
  return (
    <View>
      <Text style={styles.label}>OTP</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" maxLength={6} placeholder="••••••" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D8D5CE', borderRadius: 8, padding: 10, textAlign: 'center', letterSpacing: 2, backgroundColor: '#FFFFFF' },
});
