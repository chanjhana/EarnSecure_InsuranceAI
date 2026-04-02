import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { isValidIndianPhone } from '../../utils/validators';

type PhoneInputProps = { value: string; onChangeText: (text: string) => void };

export function PhoneInput({ value, onChangeText }: PhoneInputProps) {
  const normalized = normalizePhoneValue(value);
  const showError = normalized.length > 0 && !isValidIndianPhone(normalized);

  return (
    <View>
      <Text style={styles.label}>Phone</Text>
      <TextInput
        value={normalized}
        onChangeText={(text) => onChangeText(normalizePhoneValue(text))}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
        style={[styles.input, showError ? styles.inputError : null]}
      />
      {showError ? <Text style={styles.errorText}>Use a valid Indian mobile number.</Text> : null}
    </View>
  );
}

function normalizePhoneValue(text: string): string {
  const digits = text.replace(/\D/g, '');
  let mobileDigits = digits;

  if (digits.startsWith('91')) {
    mobileDigits = digits.slice(2);
  }
  
  mobileDigits = mobileDigits.slice(0, 10);

  const first = mobileDigits.slice(0, 5);
  const second = mobileDigits.slice(5, 10);
  const spaced = second ? `${first} ${second}` : first;

  return mobileDigits.length ? `+91 ${spaced}` : '';
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.white },
  inputError: { borderColor: colors.coral },
  errorText: { marginTop: 4, fontSize: 11, color: colors.coral },
});
