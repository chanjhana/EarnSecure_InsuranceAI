import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AppNavigator } from '../src/navigation/AppNavigator';

jest.mock('../src/api/authClient', () => ({
	sendOtp: jest.fn(async () => ({ sent: true, otp: '123456' })),
	verifyOtp: jest.fn(async () => ({ access_token: 'token-1', rider_id: 'rider-1' })),
}));

jest.mock('../src/api/ridersClient', () => ({
	linkPlatform: jest.fn(async () => ({ valid: true, activity_summary: { d30_orders: 210, avg_daily: 7.0, zones: ['Velachery', 'Adyar'] } })),
	updateRiderProfile: jest.fn(async () => ({ updated: true })),
}));

jest.mock('../src/api/premiumClient', () => ({
	calculatePremium: jest.fn(async () => ({
		premium_paise: 6800,
		gbr_score: 0.66,
		cohort_adj: 0.1,
		model_inputs: { shift_window: 'morning', zone_disruption_score: 7 },
		covers: [
			{ type: 'rain', min_paise: 30000, max_paise: 60000 },
			{ type: 'heat', min_paise: 40000, max_paise: 70000 },
			{ type: 'outage', min_paise: 30000, max_paise: 50000 },
			{ type: 'aqi', min_paise: 30000, max_paise: 40000 },
			{ type: 'closure', min_paise: 30000, max_paise: 40000 },
			{ type: 'fog', min_paise: 30000, max_paise: 30000 },
		],
	})),
}));

jest.mock('../src/api/policiesClient', () => ({
	activatePolicy: jest.fn(async () => ({
		policy_id: 'policy-1',
		rider_id: 'rider-1',
		status: 'active',
		week_start: '2026-04-01T00:00:00',
		week_end: '2026-04-07T23:59:59',
	})),
	getCurrentPolicy: jest.fn(async () => ({
		policy: {
			policy_id: 'policy-1',
			rider_id: 'rider-1',
			status: 'active',
			week_start: '2026-04-01T00:00:00',
			week_end: '2026-04-07T23:59:59',
		},
		week_progress: 0.4,
		next_premium: 6800,
		trigger_statuses: [
			{ trigger_type: 'rain', threshold_label: '>= 64.5mm', is_armed: true, last_checked_at: '2026-04-02T10:00:00', state: 'watch' },
			{ trigger_type: 'heat', threshold_label: '>= 45C', is_armed: true, last_checked_at: '2026-04-02T10:00:00', state: 'idle' },
		],
	})),
}));

jest.mock('../src/api/claimsClient', () => ({
	getClaims: jest.fn(async () => [
		{
			id: 'claim-1',
			trigger_type: 'rain',
			amount_paise: 50000,
			status: 'paid',
			created_at: '2026-04-02T11:00:00',
		},
	]),
}));

jest.mock('../src/api/adminClient', () => ({
	getPortfolioStats: jest.fn(async () => ({ active_policies: 10, loss_ratio: 0.7, weekly_payouts_paise: 500000, fraud_queue_size: 1 })),
	getFraudQueue: jest.fn(async () => [{ id: 'claim-x', rider_id: 'rider-2', fraud_score: 0.8, flag_reason: 'GPS mismatch', trigger_type: 'outage' }]),
	approveClaim: jest.fn(async () => ({ approved: true })),
	rejectClaim: jest.fn(async () => ({ rejected: true })),
	fireDemoTrigger: jest.fn(async () => ({ fired: true, event_id: 'event-1' })),
	getTriggerEvents: jest.fn(async () => []),
}));

describe('App onboarding to dashboard integration', () => {
	it('completes full onboarding and lands on rider dashboard', async () => {
		const screen = render(<AppNavigator />);

		fireEvent.changeText(screen.getByPlaceholderText('+91 98765 43210'), '+91 98765 43210');
		fireEvent.press(screen.getByText('Send OTP'));

		await waitFor(() => screen.getByPlaceholderText('000000'));
		fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
		fireEvent.press(screen.getByText('Verify'));

		await waitFor(() => screen.getByText('Which platform do you ride for?'));
		fireEvent.changeText(screen.getByPlaceholderText('SWG-CHN-291847'), 'SWG-CHN-291847');
		fireEvent.press(screen.getByText('Verify and Continue'));

		await waitFor(() => screen.getByText('Where do you usually ride?'));
		fireEvent.changeText(screen.getByPlaceholderText('600042'), '600042');
		fireEvent.press(screen.getByText('Continue'));

		await waitFor(() => screen.getByText('Your weekly premium'));
		fireEvent.press(screen.getByText('Activate coverage'));

		await waitFor(() => screen.getByText('Where should we send payouts?'));
		fireEvent.changeText(screen.getByPlaceholderText('ravi.kumar@upi'), 'ravi.kumar@upi');
		fireEvent.press(screen.getByText('Pay and Activate'));

		await waitFor(() => screen.getByText('Rider dashboard'));
		fireEvent.press(screen.getByText('History'));
		await waitFor(() => screen.getByText('Payout history'));
	});
});
