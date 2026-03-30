import { Text, View } from 'react-native';

type PhoneOTPStepProps = { onVerified: (phone: string, jwt: string) => void; resendCooldown?: number };

export function PhoneOTPStep(_props: PhoneOTPStepProps) {
  // TODO: Integrate PhoneInput + OTPInput + sendOtp/verifyOtp flow.
  return (
    <View>
      <Text>Phone OTP Step</Text>
    </View>
  );
}
