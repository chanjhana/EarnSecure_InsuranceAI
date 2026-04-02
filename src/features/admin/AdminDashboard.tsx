import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  approveClaim,
  fireDemoTrigger,
  FraudQueueItem,
  getFraudQueue,
  getPortfolioStats,
  getTriggerEvents,
  PortfolioStats as PortfolioStatsType,
  rejectClaim,
  searchRiders,
  TriggerEvent,
} from '../../api/adminClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';
import { Toast } from '../../components/ui/Toast';
import { RiderSearchResult } from '../../services/adminMockService';
import { FraudQueue } from './FraudQueue';
import { PortfolioStats } from './PortfolioStats';
import { RiderSearch } from './RiderSearch';
import { TriggerEventTable } from './TriggerEventTable';

type AdminDashboardProps = {
  defaultPinCode: string;
  onBackToRider: () => void;
};

export function AdminDashboard({ defaultPinCode, onBackToRider }: AdminDashboardProps) {
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStatsType | null>(null);
  const [fraudQueue, setFraudQueue] = useState<FraudQueueItem[]>([]);
  const [triggerEvents, setTriggerEvents] = useState<TriggerEvent[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [riderSearchResults, setRiderSearchResults] = useState<RiderSearchResult[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [portfolio, queue, events] = await Promise.all([getPortfolioStats(), getFraudQueue(), getTriggerEvents()]);
      setPortfolioStats(portfolio);
      setFraudQueue(queue);
      setTriggerEvents(events);
    };

    load().catch(() => {
      setToastMessage('Dashboard loaded with fallback demo data.');
    });
  }, []);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const riders = await searchRiders(query);
      setRiderSearchResults(riders);
      if (query.trim() && riders.length === 0) {
        setToastMessage('No riders matched your search.');
      }
    } catch {
      setToastMessage('Rider search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleApprove = async (item: FraudQueueItem) => {
    try {
      await approveClaim(item.id, 'Approved in admin dashboard');
      setFraudQueue((prev) => prev.filter((entry) => entry.id !== item.id));
      setToastMessage(`Approved ${item.id}`);
    } catch {
      setToastMessage('Unable to approve claim.');
    }
  };

  const handleReject = async (item: FraudQueueItem) => {
    try {
      await rejectClaim(item.id, 'Rejected in admin dashboard');
      setFraudQueue((prev) => prev.filter((entry) => entry.id !== item.id));
      setToastMessage(`Rejected ${item.id}`);
    } catch {
      setToastMessage('Unable to reject claim.');
    }
  };

  const handleFireDemoTrigger = async () => {
    try {
      await fireDemoTrigger({ pin_code: defaultPinCode, trigger_type: 'rain' });
      const events = await getTriggerEvents();
      setTriggerEvents(events);
      setToastMessage('Demo trigger fired.');
    } catch {
      setToastMessage('Demo trigger could not be fired.');
    }
  };

  return (
    <View style={styles.dashboardWrap}>
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.headline}>Admin dashboard</Text>
          <Text style={styles.subhead}>Live portfolio and fraud controls</Text>
        </View>
        <View style={styles.backBtnWrap}>
          <PrimaryButton label="Back to Rider" onPress={onBackToRider} variant="outline" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PortfolioStats stats={portfolioStats} />
        <RiderSearch riders={riderSearchResults} loading={searchLoading} onSearch={handleSearch} />
        <FraudQueue items={fraudQueue} onApprove={handleApprove} onReject={handleReject} />
        <TriggerEventTable events={triggerEvents} onFireDemoTrigger={handleFireDemoTrigger} />
      </ScrollView>

      {toastMessage ? <Toast message={toastMessage} variant="info" onClose={() => setToastMessage(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardWrap: { flex: 1, paddingTop: 48, backgroundColor: colors.paper },
  dashboardHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headline: { fontSize: 24, fontWeight: '800', color: colors.ink2 },
  subhead: { fontSize: 12, color: colors.muted },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  backBtnWrap: { minWidth: 132 },
});
