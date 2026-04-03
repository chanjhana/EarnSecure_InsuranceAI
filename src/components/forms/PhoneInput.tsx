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
        placeholderTextColor={colors.ink3}
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
  label: { fontSize: 13, marginBottom: 8, color: colors.ink2, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, backgroundColor: 'rgba(0,0,0,0.3)', color: colors.ink, fontSize: 16 },
  inputError: { borderColor: colors.coral },
  errorText: { marginTop: 6, fontSize: 12, color: colors.coral },
});
