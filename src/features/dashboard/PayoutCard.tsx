import { Text, View } from 'react-native';
import { Claim } from '../../api/claimsClient';

type PayoutCardProps = { claim: Claim; showVerifications?: boolean; expanded?: boolean };

export function PayoutCard(_props: PayoutCardProps) {
  // TODO: Show claim amount/status/timestamp + optional fraud checks panel.
  return (
    <View>
      <Text>Payout Card</Text>
    </View>
  );
}
