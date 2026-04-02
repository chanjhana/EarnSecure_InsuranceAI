export type FraudQueueItem = {
  id: string;
  rider_id: string;
  fraud_score: number;
  flag_reason: string;
  trigger_type: string;
};

export type TriggerEvent = {
  event_id: string;
  trigger_type: 'rain' | 'heat' | 'outage' | 'aqi' | 'closure' | 'fog';
  zone: string;
  metric: number;
  threshold: string;
  observed_at: string;
  status: 'pending' | 'processing' | 'approved' | 'held' | 'paid' | 'rejected';
  affected_riders: number;
};

export type RiderSearchResult = {
  rider_id: string;
  name: string;
  phone: string;
  platform: 'swiggy' | 'zomato' | 'zepto' | 'blinkit';
  home_zone: string;
  orders_d30: number;
  claims_d30: number;
  paid_claims_d30: number;
  paid_amount_paise_d30: number;
  risk_score: number;
  approval_rate: number;
  last_seen_at: string;
};

const BASE_ZONES = ['Velachery', 'Adyar', 'Tambaram', 'OMR', 'Anna Nagar', 'T Nagar'];
const BASE_NAMES = ['Ravi Kumar', 'Arjun Das', 'Meena Raj', 'Karthik S', 'Priya Nair', 'Sanjay Iyer'];
const BASE_PLATFORMS: Array<RiderSearchResult['platform']> = ['swiggy', 'zomato', 'zepto', 'blinkit'];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function createPrng(seed: number): () => number {
  let current = seed;
  return () => {
    current += 0x6d2b79f5;
    let t = current;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function riderFromSeed(seed: number, idx: number, query: string): RiderSearchResult {
  const random = createPrng(seed + idx * 97);
  const ordersD30 = 95 + Math.floor(random() * 190);
  const claimsD30 = Math.max(1, Math.floor(ordersD30 * (0.04 + random() * 0.08)));
  const paidClaimsD30 = Math.max(1, Math.floor(claimsD30 * (0.58 + random() * 0.32)));

  const avgClaimPaise = 18000 + Math.floor(random() * 26000);
  const paidAmountPaiseD30 = paidClaimsD30 * avgClaimPaise;

  // Risk is derived from claim frequency and claim size pressure over order volume.
  const frequencyRatio = claimsD30 / Math.max(1, ordersD30);
  const severityRatio = paidAmountPaiseD30 / Math.max(1, ordersD30 * 25000);
  const riskScore = clamp(0.25 + frequencyRatio * 1.9 + severityRatio * 0.9, 0.05, 0.99);
  const approvalRate = clamp(paidClaimsD30 / Math.max(1, claimsD30), 0.01, 0.99);

  const name = BASE_NAMES[idx % BASE_NAMES.length];
  const zone = BASE_ZONES[(idx + seed) % BASE_ZONES.length];
  const platform = BASE_PLATFORMS[(idx + Math.floor(random() * 3)) % BASE_PLATFORMS.length];
  const riderIdSuffix = String((seed + idx * 137) % 10000).padStart(4, '0');

  const now = Date.now();
  const minutesAgo = Math.floor(random() * 420);

  return {
    rider_id: `rider-${riderIdSuffix}`,
    name,
    phone: `+91 98${String((seed + idx * 301) % 100000000).padStart(8, '0')}`,
    platform,
    home_zone: zone,
    orders_d30: ordersD30,
    claims_d30: claimsD30,
    paid_claims_d30: paidClaimsD30,
    paid_amount_paise_d30: paidAmountPaiseD30,
    risk_score: Number(riskScore.toFixed(3)),
    approval_rate: Number(approvalRate.toFixed(3)),
    last_seen_at: new Date(now - minutesAgo * 60000).toISOString(),
  };
}

export function mockSearchRiders(query: string): RiderSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const seed = hashString(normalized);
  const size = 4 + (seed % 3);
  const riders = Array.from({ length: size }, (_, idx) => riderFromSeed(seed, idx, normalized));

  return riders.sort((left, right) => right.risk_score - left.risk_score);
}

export function mockFraudQueue(): FraudQueueItem[] {
  const riders = mockSearchRiders('fraud baseline');
  return riders.slice(0, 4).map((rider, index) => ({
    id: `claim-${rider.rider_id}-${index}`,
    rider_id: rider.rider_id,
    fraud_score: Number(clamp(rider.risk_score + 0.08 * (index + 1), 0.01, 0.99).toFixed(2)),
    flag_reason: rider.risk_score > 0.8 ? 'Unusual payout frequency' : 'GPS mismatch',
    trigger_type: index % 2 === 0 ? 'rain' : 'outage',
  }));
}

export function mockTriggerEvents(): TriggerEvent[] {
  const random = createPrng(hashString('trigger-events'));
  const zones = BASE_ZONES.slice(0, 5);
  const triggerTypes: TriggerEvent['trigger_type'][] = ['rain', 'heat', 'outage', 'aqi', 'closure'];

  return zones.map((zone, index) => {
    const metric = Number((40 + random() * 40).toFixed(1));
    const affected = 10 + Math.floor(random() * 120);
    const statusPool: TriggerEvent['status'][] = ['processing', 'approved', 'held', 'pending'];

    return {
      event_id: `event-${index + 1}`,
      trigger_type: triggerTypes[index % triggerTypes.length],
      zone,
      metric,
      threshold: index % 2 === 0 ? '>= 64.5' : '>= 43.0',
      observed_at: new Date(Date.now() - index * 27 * 60000).toISOString(),
      status: statusPool[index % statusPool.length],
      affected_riders: affected,
    };
  });
}

export function mockPortfolioStats(queue: FraudQueueItem[], events: TriggerEvent[]): {
  active_policies: number;
  loss_ratio: number;
  weekly_payouts_paise: number;
  fraud_queue_size: number;
} {
  const totalAffectedRiders = events.reduce((sum, event) => sum + event.affected_riders, 0);
  const activePolicies = 420 + totalAffectedRiders;
  const avgPremiumPaise = 6100;

  const weatherPressure = events.reduce((sum, event) => sum + event.metric, 0) / Math.max(1, events.length);
  const expectedClaimRate = 0.11 + weatherPressure / 600;
  const queueRiskPressure = queue.reduce((sum, item) => sum + item.fraud_score, 0) / Math.max(1, queue.length);

  const expectedPayoutPerPolicy = avgPremiumPaise * (expectedClaimRate + queueRiskPressure * 0.08);
  const weeklyPayoutsPaise = Math.round(activePolicies * expectedPayoutPerPolicy);

  const weeklyPremiumCollected = activePolicies * avgPremiumPaise;
  const lossRatio = clamp(weeklyPayoutsPaise / Math.max(1, weeklyPremiumCollected), 0.35, 1.05);

  return {
    active_policies: activePolicies,
    loss_ratio: Number(lossRatio.toFixed(3)),
    weekly_payouts_paise: weeklyPayoutsPaise,
    fraud_queue_size: queue.length,
  };
}
