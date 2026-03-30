import { Text, View } from 'react-native';
import { Claim } from '../../api/claimsClient';

type PayoutHistoryProps = { riderId: string; claims: Claim[]; totalThisWeek: number };

export function PayoutHistory(_props: PayoutHistoryProps) {
  // TODO: Render chronological history list and weekly payout total.
  return (
    <View>
      <Text>Payout History</Text>
    </View>
  );
}
