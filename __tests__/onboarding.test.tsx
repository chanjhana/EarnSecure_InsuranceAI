import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AppNavigator } from '../src/navigation/AppNavigator';

jest.mock('../src/api/authClient', () => ({
	sendOtp: jest.fn(async () => ({ sent: true, otp: '123456' })),
	verifyOtp: jest.fn(async () => ({ access_token: 'token-1', rider_id: 'rider-1' })),
	completeSignup: jest.fn(async () => ({ success: true })),
}));

jest.mock('../src/api/ridersClient', () => ({
	linkPlatform: jest.fn(async () => ({ valid: true, activity_summary: { d30_orders: 210, avg_daily: 7.0, zones: ['Velachery', 'Adyar'] } })),
	getZones: jest.fn(async () => ({ zones: ['Mettupalayam', 'Palladam'] })),
	updateRiderProfile: jest.fn(async () => ({ updated: true })),
}));

jest.mock('../src/api/premiumClient', () => ({
	calculatePremium: jest.fn(async () => ({
		weekly_premium_paise: 6800,
		weekly_premium_inr: 68,
		risk_score: 0.42,
		breakdown: {
			weather_risk: {
				rain_probability: 0.6,
				max_rainfall_mm: 48,
				max_heat_index: 39,
				min_visibility_m: 900,
				rainy_days: 3,
				contribution: 0.22,
			},
			traffic_risk: { jam_factor: 1.7, contribution: 0.1 },
			shift_risk: { shifts: ['afternoon'], contribution: 0.05 },
			zone_risk: { zone_count: 2, contribution: 0.05 },
		},
		city_name: 'Coimbatore',
		forecast_source: 'mock',
		model: 'GBR-weather-v3-traffic',
	})),
}));

jest.mock('../src/api/paymentsClient', () => ({
	createUpiQrPayment: jest.fn(async () => ({
		payment_id: 'pay-1',
		rider_id: 'rider-1',
		provider: 'upi_qr',
		status: 'initiated',
		amount_paise: 6800,
		created_at: '2026-04-02T10:00:00',
		updated_at: '2026-04-02T10:00:00',
		qr_image_url: 'https://example.com/qr.png',
	})),
	submitUpiQrTransaction: jest.fn(async () => ({
		payment_id: 'pay-1',
		rider_id: 'rider-1',
		provider: 'upi_qr',
		status: 'pending_admin_confirmation',
		amount_paise: 6800,
		created_at: '2026-04-02T10:00:00',
		updated_at: '2026-04-02T10:05:00',
		upi_transaction_id: 'UPIREF123',
		payer_upi_id: 'ravi.kumar@upi',
	})),
	createRazorpayOrder: jest.fn(async () => ({
		payment_id: 'pay-rzp-1',
		rider_id: 'rider-1',
		provider: 'razorpay',
		status: 'initiated',
		amount_paise: 6800,
		created_at: '2026-04-02T10:00:00',
		updated_at: '2026-04-02T10:00:00',
		checkout_url: 'https://checkout.razorpay.com',
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

		fireEvent.changeText(screen.getByPlaceholderText('98765 43210'), '9876543210');
		fireEvent.press(screen.getByText('Send OTP →'));

		await waitFor(() => screen.getByLabelText('OTP digit 1'));
		fireEvent.changeText(screen.getByLabelText('OTP digit 1'), '1');
		fireEvent.changeText(screen.getByLabelText('OTP digit 2'), '2');
		fireEvent.changeText(screen.getByLabelText('OTP digit 3'), '3');
		fireEvent.changeText(screen.getByLabelText('OTP digit 4'), '4');
		fireEvent.changeText(screen.getByLabelText('OTP digit 5'), '5');
		fireEvent.changeText(screen.getByLabelText('OTP digit 6'), '6');
		fireEvent.press(screen.getByText('Verify & Continue →'));

		await waitFor(() => screen.getByText(/Quick setup/i));
		fireEvent.changeText(screen.getByPlaceholderText('Ravi'), 'Ravi');
		fireEvent.changeText(screen.getByPlaceholderText('Kumar'), 'Kumar');
		fireEvent.changeText(screen.getByPlaceholderText('TN 09 AB 1234'), 'TN09AB1234');
		fireEvent.changeText(screen.getByPlaceholderText('Create password'), 'pass1234');
		fireEvent.press(screen.getByText('Continue →'));

		await waitFor(() => screen.getByText(/Where do you/i));
		fireEvent.changeText(screen.getByPlaceholderText('SWG-CHN-291847'), 'SWG-CHN-291847');
		fireEvent.changeText(screen.getByPlaceholderText('600042 — zones auto-load'), '600042');
		fireEvent.press(screen.getByText('Calculate My Premium →'));

		await waitFor(() => screen.getByText('Your weekly premium'));
		fireEvent.changeText(screen.getByPlaceholderText('ravi.kumar@upi'), 'ravi.kumar@upi');
		fireEvent.press(screen.getByText('Scan & Pay UPI QR - ₹68'));

		await waitFor(() => screen.getByPlaceholderText('UPI transaction/reference ID'));
		fireEvent.changeText(screen.getByPlaceholderText('UPI transaction/reference ID'), 'UPIREF123');
		fireEvent.press(screen.getByText('Submit Transaction ID'));

		await waitFor(() => screen.getByText(/Rider dashboard/i));
		expect(screen.getByText('History')).toBeTruthy();
		screen.unmount();
	});
});
