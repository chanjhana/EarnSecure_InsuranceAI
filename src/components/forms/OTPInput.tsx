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
        placeholderTextColor={colors.ink3}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 8, color: colors.ink2, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    textAlign: 'center',
    letterSpacing: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
});
