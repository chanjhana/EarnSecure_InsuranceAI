import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';

type OTPInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onComplete?: (otp: string) => void;
};

export function OTPInput({ value, onChangeText, onComplete }: OTPInputProps) {
  return (
    <View>
      <Text style={styles.label}>OTP</Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          const next = text.replace(/\D/g, '').slice(0, 6);
          onChangeText(next);
          if (next.length === 6) {
            onComplete?.(next);
          }
        }}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    textAlign: 'center',
    letterSpacing: 6,
    backgroundColor: colors.white,
    fontWeight: '700',
  },
});
