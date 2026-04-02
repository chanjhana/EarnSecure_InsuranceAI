# Test Scaffold

Current automated integration coverage:

1. Frontend integration test in [__tests__/onboarding.test.tsx](__tests__/onboarding.test.tsx):
	Phone OTP -> platform link -> zone/shift -> premium reveal -> UPI activation -> rider dashboard.
2. Backend API integration test in [backend/tests/test_api.py](backend/tests/test_api.py):
	full onboarding contract flow, claims endpoints, admin trigger-monitor, fraud queue decisions.

Run locally:

1. `npm run test:ci`
2. `npm run backend:test`
3. `npm run verify`
