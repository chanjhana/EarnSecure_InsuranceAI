import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AccountStatusOption,
  approveClaim,
  confirmPayment,
  fireDemoTrigger,
  FraudQueueItem,
  getAccountStatusOptions,
  getFraudQueue,
  getPendingPayments,
  getPortfolioStats,
  getTriggerEvents,
  PaymentRecord,
  PortfolioStats as PortfolioStatsType,
  rejectClaim,
  searchRiders,
  RiderSearchResult,
  TriggerEvent,
} from '../../api/adminClient';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { colors } from '../../theme/colors';
import { Toast } from '../../components/ui/Toast';
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
  const [pendingPayments, setPendingPayments] = useState<PaymentRecord[]>([]);
  const [statusOptions, setStatusOptions] = useState<AccountStatusOption[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [riderSearchResults, setRiderSearchResults] = useState<RiderSearchResult[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [portfolio, queue, events, payments, options] = await Promise.all([
        getPortfolioStats(),
        getFraudQueue(),
        getTriggerEvents(),
        getPendingPayments(),
        getAccountStatusOptions(),
      ]);
      setPortfolioStats(portfolio);
      setFraudQueue(queue);
      setTriggerEvents(events);
      setPendingPayments(payments);
      setStatusOptions(options);
    };

    load().catch(() => {
      setToastMessage('Unable to load admin data. Check the backend connection.');
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

  const handleConfirmPayment = async (payment: PaymentRecord, approve: boolean) => {
    try {
      await confirmPayment(payment.payment_id, {
        approve,
        admin_note: approve ? 'Payment confirmed by admin dashboard' : 'Payment rejected by admin dashboard',
        account_status: approve ? 'O7_PAYMENT_CONFIRMED_WEEK_ACTIVE' : 'O8_PAYMENT_REJECTED_ACTION_REQUIRED',
      });
      setPendingPayments((prev) => prev.filter((item) => item.payment_id !== payment.payment_id));
      setToastMessage(approve ? `Confirmed ${payment.payment_id}` : `Rejected ${payment.payment_id}`);
    } catch {
      setToastMessage('Unable to update payment confirmation status.');
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

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pending UPI confirmations</Text>
          {pendingPayments.length === 0 ? <Text style={styles.sectionEmpty}>No pending payment confirmations.</Text> : null}
          {pendingPayments.map((payment) => (
            <View key={payment.payment_id} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>{payment.payment_id}</Text>
                <Text style={styles.paymentMeta}>{payment.rider_id} · {payment.provider.toUpperCase()}</Text>
                <Text style={styles.paymentMeta}>Txn: {payment.upi_transaction_id ?? 'pending'}</Text>
                <Text style={styles.paymentMeta}>Status: {payment.status}</Text>
              </View>
              <View style={styles.paymentActions}>
                <PrimaryButton label="Confirm" onPress={() => handleConfirmPayment(payment, true)} />
                <PrimaryButton label="Reject" onPress={() => handleConfirmPayment(payment, false)} variant="outline" />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account status reference</Text>
          {statusOptions.map((option) => (
            <View key={option.code} style={styles.statusOptionRow}>
              <Text style={styles.statusCode}>{option.code}</Text>
              <Text style={styles.statusText}>{option.label} - {option.description}</Text>
            </View>
          ))}
        </View>

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
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  sectionEmpty: { color: colors.muted, fontSize: 12 },
  paymentRow: {
    borderWidth: 1,
    borderColor: colors.paper3,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: colors.paper,
  },
  paymentTitle: { fontSize: 12, fontWeight: '700', color: colors.ink2 },
  paymentMeta: { fontSize: 11, color: colors.muted },
  paymentActions: { flexDirection: 'row', gap: 8 },
  statusOptionRow: { gap: 2, borderTopWidth: 1, borderTopColor: colors.paper3, paddingTop: 8 },
  statusCode: { fontSize: 11, fontWeight: '700', color: colors.tealDark },
  statusText: { fontSize: 11, color: colors.muted },
});
