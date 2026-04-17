import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RiderSearchResult } from '../../api/adminClient';
import { colors } from '../../theme/colors';
import { paiseToInr } from '../../utils/currency';

type RiderSearchProps = {
  riders: RiderSearchResult[];
  loading: boolean;
  onSearch: (query: string) => void;
};

export function RiderSearch({ riders, loading, onSearch }: RiderSearchProps) {
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => [...riders].sort((left, right) => right.risk_score - left.risk_score),
    [riders],
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Rider search</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search rider name, phone, or id"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
        />
        <Pressable style={styles.searchButton} onPress={() => onSearch(query)}>
          <Text style={styles.searchButtonText}>{loading ? '...' : 'Find'}</Text>
        </Pressable>
      </View>

      {sorted.length === 0 ? <Text style={styles.empty}>Search to view rider profile and claims summary.</Text> : null}

      {sorted.map((rider) => (
        <View key={rider.rider_id} style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.name}>{rider.name}</Text>
            <Text style={styles.risk}>Risk {rider.risk_score.toFixed(2)}</Text>
          </View>
          <Text style={styles.meta}>{rider.rider_id} · {rider.phone}</Text>
          <Text style={styles.meta}>{rider.platform.toUpperCase()} · {rider.home_zone}</Text>
          {rider.account_status ? <Text style={styles.meta}>Account: {rider.account_status}</Text> : null}

          <View style={styles.statsRow}>
            <Text style={styles.stat}>Orders(30d): {rider.orders_d30}</Text>
            <Text style={styles.stat}>Claims(30d): {rider.claims_d30}</Text>
            <Text style={styles.stat}>Approved: {(rider.approval_rate * 100).toFixed(0)}%</Text>
          </View>
          <Text style={styles.payout}>Paid in 30d: {paiseToInr(rider.paid_amount_paise_d30)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 12,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.ink2,
    fontSize: 12,
  },
  searchButton: {
    backgroundColor: colors.teal,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 11 },
  empty: { color: colors.muted, fontSize: 12 },
  resultCard: {
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: 8,
    backgroundColor: colors.paper,
    padding: 10,
    gap: 4,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.ink2, fontSize: 13, fontWeight: '700' },
  risk: { color: colors.coral, fontSize: 12, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  stat: { color: colors.ink2, fontSize: 11, fontWeight: '600' },
  payout: { color: colors.tealDark, fontSize: 12, fontWeight: '700' },
});
