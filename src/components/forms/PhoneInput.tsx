import { StyleSheet, Text, TextInput, View } from 'react-native';

type PhoneInputProps = { value: string; onChangeText: (text: string) => void };

export function PhoneInput({ value, onChangeText }: PhoneInputProps) {
  // TODO: Normalize to +91 format and reject invalid lengths.
  return (
    <View>
      <Text style={styles.label}>Phone</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType="phone-pad" placeholder="+91 98765 43210" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D8D5CE', borderRadius: 8, padding: 10, backgroundColor: '#FFFFFF' },
});
