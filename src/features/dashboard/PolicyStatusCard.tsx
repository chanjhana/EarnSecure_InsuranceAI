import { Text, View } from 'react-native';
import { Policy } from '../../api/policiesClient';

type PolicyStatusCardProps = { policy: Policy; weekProgress: number; nextPremium: number };

export function PolicyStatusCard(_props: PolicyStatusCardProps) {
  // TODO: Build protection status card with weekly progress and premium summary.
  return (
    <View>
      <Text>Policy Status Card</Text>
    </View>
  );
}
