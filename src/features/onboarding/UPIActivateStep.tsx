import { Text, View } from 'react-native';

type UPIActivateStepProps = { premiumPaise: number; onActivated: (policyId: string) => void; razorpayKey?: string };

export function UPIActivateStep(_props: UPIActivateStepProps) {
  // TODO: Validate UPI, activate policy, then route to rider dashboard.
  return (
    <View>
      <Text>UPI Activate Step</Text>
    </View>
  );
}
