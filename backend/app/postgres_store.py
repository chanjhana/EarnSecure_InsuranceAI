"""PostgreSQL-backed store used by API routers."""
from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import psycopg
from psycopg.types.json import Jsonb

from .storage import (
    ACCOUNT_STATUS_OPTIONS,
    AccountStatusHistoryRecord,
    ClaimRecord,
    InMemoryStore,
    PaymentRecord,
    PolicyRecord,
    RiderRecord,
    TriggerEventRecord,
)

logger = logging.getLogger("earnsecure.postgres")


class PostgresBackedStore(InMemoryStore):
    """Storage adapter that persists all rider/payment/admin state in PostgreSQL."""

    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._init_empty_state()
        self._bootstrap_schema()
        self._ping()
        self._load_all_from_db()
        self._seed_if_empty()

    def _init_empty_state(self) -> None:
        self.otps: dict[str, dict[str, Any]] = {}
        self.riders: dict[str, RiderRecord] = {}
        self.policies: dict[str, PolicyRecord] = {}
        self.claims: dict[str, ClaimRecord] = {}
        self.payments: dict[str, PaymentRecord] = {}
        self.status_history: dict[str, list[AccountStatusHistoryRecord]] = {}
        self.rider_policy_index: dict[str, str] = {}
        self.fraud_queue: list[str] = []
        self.trigger_events: list[TriggerEventRecord] = []
        self.weekly_premiums_paise = 150_000
        self.weekly_payouts_paise = 0

    def _conn(self) -> psycopg.Connection:
        return psycopg.connect(self.database_url)

    @staticmethod
    def _to_aware_utc(value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _to_naive_utc(value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return None
        if value.tzinfo is None:
            return value
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def _json_list(value: Any) -> list[Any]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except ValueError:
                return []
        return []

    @staticmethod
    def _json_dict(value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except ValueError:
                return {}
        return {}

    def _migrate_legacy_riders_schema(self, cur: psycopg.Cursor) -> None:
        # Legacy deployments had a reduced riders table; this migration makes it forward-compatible.
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS vehicle_number TEXT")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS legal_name TEXT")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS password_hash TEXT")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS verified_by TEXT")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'O1_OTP_SENT_NOT_VERIFIED'")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS account_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS account_note TEXT")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
        cur.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")

        # Convert legacy TEXT JSON columns to JSONB when needed.
        cur.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'riders'
                      AND column_name = 'zones_json'
                      AND data_type <> 'jsonb'
                ) THEN
                    ALTER TABLE riders
                    ALTER COLUMN zones_json TYPE JSONB
                    USING CASE
                        WHEN zones_json IS NULL OR BTRIM(zones_json) = '' THEN '[]'::jsonb
                        WHEN LEFT(BTRIM(zones_json), 1) IN ('[', '{') THEN zones_json::jsonb
                        ELSE '[]'::jsonb
                    END;
                END IF;
            END $$;
            """
        )
        cur.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'riders'
                      AND column_name = 'shift_windows_json'
                      AND data_type <> 'jsonb'
                ) THEN
                    ALTER TABLE riders
                    ALTER COLUMN shift_windows_json TYPE JSONB
                    USING CASE
                        WHEN shift_windows_json IS NULL OR BTRIM(shift_windows_json) = '' THEN '[]'::jsonb
                        WHEN LEFT(BTRIM(shift_windows_json), 1) IN ('[', '{') THEN shift_windows_json::jsonb
                        ELSE '[]'::jsonb
                    END;
                END IF;
            END $$;
            """
        )
        cur.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'riders'
                      AND column_name = 'activity_summary_json'
                      AND data_type <> 'jsonb'
                ) THEN
                    ALTER TABLE riders
                    ALTER COLUMN activity_summary_json TYPE JSONB
                    USING CASE
                        WHEN activity_summary_json IS NULL OR BTRIM(activity_summary_json) = '' THEN '{}'::jsonb
                        WHEN LEFT(BTRIM(activity_summary_json), 1) = '{' THEN activity_summary_json::jsonb
                        ELSE '{}'::jsonb
                    END;
                END IF;
            END $$;
            """
        )
        cur.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'riders'
                      AND column_name = 'account_flags_json'
                      AND data_type <> 'jsonb'
                ) THEN
                    ALTER TABLE riders
                    ALTER COLUMN account_flags_json TYPE JSONB
                    USING CASE
                        WHEN account_flags_json IS NULL OR BTRIM(account_flags_json) = '' THEN '{}'::jsonb
                        WHEN LEFT(BTRIM(account_flags_json), 1) = '{' THEN account_flags_json::jsonb
                        ELSE '{}'::jsonb
                    END;
                END IF;
            END $$;
            """
        )

        cur.execute("ALTER TABLE riders ALTER COLUMN zones_json SET DEFAULT '[]'::jsonb")
        cur.execute("ALTER TABLE riders ALTER COLUMN shift_windows_json SET DEFAULT '[]'::jsonb")
        cur.execute("ALTER TABLE riders ALTER COLUMN activity_summary_json SET DEFAULT '{}'::jsonb")
        cur.execute("ALTER TABLE riders ALTER COLUMN account_flags_json SET DEFAULT '{}'::jsonb")

        cur.execute("UPDATE riders SET zones_json = '[]'::jsonb WHERE zones_json IS NULL")
        cur.execute("UPDATE riders SET shift_windows_json = '[]'::jsonb WHERE shift_windows_json IS NULL")
        cur.execute("UPDATE riders SET activity_summary_json = '{}'::jsonb WHERE activity_summary_json IS NULL")
        cur.execute("UPDATE riders SET account_flags_json = '{}'::jsonb WHERE account_flags_json IS NULL")

    def _migrate_legacy_payments_schema(self, cur: psycopg.Cursor) -> None:
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS upi_uri TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_image_url TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS upi_transaction_id TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_upi_id TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_key TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_note TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by TEXT")
        cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ")

    def _bootstrap_schema(self) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS riders (
                            rider_id TEXT PRIMARY KEY,
                            phone TEXT NOT NULL UNIQUE,
                            vehicle_number TEXT,
                            legal_name TEXT,
                            password_hash TEXT,
                            is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                            verified_by TEXT,
                            verified_at TIMESTAMPTZ,
                            platform TEXT,
                            pin_code TEXT,
                            zones_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                            shift_windows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                            upi_id TEXT,
                            activity_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                            account_status TEXT NOT NULL DEFAULT 'O1_OTP_SENT_NOT_VERIFIED',
                            account_flags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                            account_note TEXT,
                            phone_verified_at TIMESTAMPTZ,
                            payment_submitted_at TIMESTAMPTZ,
                            payment_confirmed_at TIMESTAMPTZ,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    self._migrate_legacy_riders_schema(cur)
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone)")

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS otps (
                            phone TEXT PRIMARY KEY,
                            otp TEXT NOT NULL,
                            expires_at TIMESTAMPTZ NOT NULL,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS policies (
                            policy_id TEXT PRIMARY KEY,
                            rider_id TEXT NOT NULL,
                            status TEXT NOT NULL DEFAULT 'active',
                            week_start TIMESTAMPTZ NOT NULL,
                            week_end TIMESTAMPTZ NOT NULL,
                            next_premium INTEGER NOT NULL DEFAULT 0,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_policies_rider ON policies(rider_id)")

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS claims (
                            claim_id TEXT PRIMARY KEY,
                            rider_id TEXT NOT NULL,
                            trigger_type TEXT NOT NULL,
                            amount_paise INTEGER NOT NULL,
                            status TEXT NOT NULL DEFAULT 'approved',
                            fraud_score REAL NOT NULL DEFAULT 0.0,
                            fraud_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
                            trigger_event JSONB NOT NULL DEFAULT '{}'::jsonb,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_claims_rider ON claims(rider_id)")

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS trigger_events (
                            event_id TEXT PRIMARY KEY,
                            trigger_type TEXT NOT NULL,
                            zone TEXT NOT NULL,
                            metric REAL NOT NULL,
                            threshold TEXT NOT NULL,
                            observed_at TIMESTAMPTZ NOT NULL,
                            status TEXT NOT NULL DEFAULT 'pending',
                            affected_riders INTEGER NOT NULL DEFAULT 0,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS fraud_queue (
                            claim_id TEXT PRIMARY KEY,
                            added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS payments (
                            payment_id TEXT PRIMARY KEY,
                            rider_id TEXT NOT NULL,
                            provider TEXT NOT NULL,
                            amount_paise INTEGER NOT NULL,
                            status TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL,
                            updated_at TIMESTAMPTZ NOT NULL,
                            upi_uri TEXT,
                            qr_image_url TEXT,
                            upi_transaction_id TEXT,
                            payer_upi_id TEXT,
                            razorpay_order_id TEXT,
                            razorpay_payment_id TEXT,
                            checkout_key TEXT,
                            checkout_url TEXT,
                            admin_note TEXT,
                            confirmed_by TEXT,
                            confirmed_at TIMESTAMPTZ
                        )
                        """
                    )
                    self._migrate_legacy_payments_schema(cur)
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_payments_rider ON payments(rider_id)")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)")

                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS rider_status_history (
                            history_id BIGSERIAL PRIMARY KEY,
                            rider_id TEXT NOT NULL,
                            from_status TEXT,
                            to_status TEXT NOT NULL,
                            changed_by TEXT NOT NULL,
                            note TEXT,
                            source TEXT NOT NULL DEFAULT 'manual',
                            payment_id TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cur.execute(
                        "CREATE INDEX IF NOT EXISTS idx_status_history_rider_created ON rider_status_history(rider_id, created_at DESC)"
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to bootstrap schema: %s", exc)

    def _ping(self) -> None:
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()

    def _seed_if_empty(self) -> None:
        if self.riders:
            return
        self._seed_sample_data()
        self._persist_seed_data()

    def _persist_seed_data(self) -> None:
        for rider in self.riders.values():
            self._upsert_rider(rider)
        for policy in self.policies.values():
            self._upsert_policy(policy)
        for claim in self.claims.values():
            self._upsert_claim(claim)
        for event in self.trigger_events:
            self._upsert_trigger_event(event)
        for payment in self.payments.values():
            self._upsert_payment(payment)
        for claim_id in self.fraud_queue:
            self._add_to_fraud_queue(claim_id)
        for rider_id, history in self.status_history.items():
            for item in history:
                self._insert_status_history(item)
            # Ensure history map has key even if list was empty in seed
            self.status_history.setdefault(rider_id, history)

    def _load_all_from_db(self) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT
                            rider_id,
                            phone,
                            vehicle_number,
                            legal_name,
                            password_hash,
                            is_verified,
                            verified_by,
                            verified_at,
                            platform,
                            pin_code,
                            zones_json,
                            shift_windows_json,
                            upi_id,
                            activity_summary_json,
                            account_status,
                            account_flags_json,
                            account_note,
                            phone_verified_at,
                            payment_submitted_at,
                            payment_confirmed_at
                        FROM riders
                        """
                    )
                    for row in cur.fetchall():
                        rider = RiderRecord(
                            rider_id=row[0],
                            phone=row[1],
                            vehicle_number=row[2],
                            legal_name=row[3],
                            password_hash=row[4],
                            is_verified=bool(row[5]),
                            verified_by=row[6],
                            verified_at=self._to_naive_utc(row[7]),
                            platform=row[8],
                            pin_code=row[9],
                            zones=self._json_list(row[10]),
                            shift_windows=self._json_list(row[11]),
                            upi_id=row[12],
                            activity_summary=self._json_dict(row[13]),
                            account_status=row[14] if row[14] in ACCOUNT_STATUS_OPTIONS else "O1_OTP_SENT_NOT_VERIFIED",
                            account_flags=self._json_dict(row[15]),
                            account_note=row[16],
                            phone_verified_at=self._to_naive_utc(row[17]),
                            payment_submitted_at=self._to_naive_utc(row[18]),
                            payment_confirmed_at=self._to_naive_utc(row[19]),
                        )
                        self.riders[rider.rider_id] = rider

                    cur.execute(
                        "SELECT policy_id, rider_id, status, week_start, week_end, next_premium FROM policies"
                    )
                    for row in cur.fetchall():
                        policy = PolicyRecord(
                            policy_id=row[0],
                            rider_id=row[1],
                            status=row[2],
                            week_start=self._to_naive_utc(row[3]) or datetime.utcnow(),
                            week_end=self._to_naive_utc(row[4]) or datetime.utcnow(),
                            next_premium=row[5],
                        )
                        self.policies[policy.policy_id] = policy
                        if policy.status == "active":
                            existing_policy_id = self.rider_policy_index.get(policy.rider_id)
                            if not existing_policy_id:
                                self.rider_policy_index[policy.rider_id] = policy.policy_id
                            else:
                                existing_policy = self.policies.get(existing_policy_id)
                                if existing_policy and policy.week_end > existing_policy.week_end:
                                    self.rider_policy_index[policy.rider_id] = policy.policy_id

                    cur.execute(
                        """
                        SELECT claim_id, rider_id, trigger_type, amount_paise, status, fraud_score, fraud_checks, trigger_event, created_at
                        FROM claims
                        """
                    )
                    for row in cur.fetchall():
                        claim = ClaimRecord(
                            id=row[0],
                            rider_id=row[1],
                            trigger_type=row[2],
                            amount_paise=row[3],
                            status=row[4],
                            fraud_score=float(row[5]),
                            fraud_checks=self._json_dict(row[6]),
                            trigger_event=self._json_dict(row[7]),
                            created_at=self._to_naive_utc(row[8]) or datetime.utcnow(),
                        )
                        self.claims[claim.id] = claim

                    cur.execute("SELECT claim_id FROM fraud_queue")
                    self.fraud_queue = [row[0] for row in cur.fetchall()]

                    cur.execute(
                        """
                        SELECT event_id, trigger_type, zone, metric, threshold, observed_at, status, affected_riders
                        FROM trigger_events
                        """
                    )
                    self.trigger_events = []
                    for row in cur.fetchall():
                        self.trigger_events.append(
                            TriggerEventRecord(
                                event_id=row[0],
                                trigger_type=row[1],
                                zone=row[2],
                                metric=float(row[3]),
                                threshold=row[4],
                                observed_at=self._to_naive_utc(row[5]) or datetime.utcnow(),
                                status=row[6],
                                affected_riders=row[7],
                            )
                        )

                    cur.execute(
                        """
                        SELECT
                            payment_id,
                            rider_id,
                            provider,
                            amount_paise,
                            status,
                            created_at,
                            updated_at,
                            upi_uri,
                            qr_image_url,
                            upi_transaction_id,
                            payer_upi_id,
                            razorpay_order_id,
                            razorpay_payment_id,
                            checkout_key,
                            checkout_url,
                            admin_note,
                            confirmed_by,
                            confirmed_at
                        FROM payments
                        """
                    )
                    for row in cur.fetchall():
                        payment = PaymentRecord(
                            payment_id=row[0],
                            rider_id=row[1],
                            provider=row[2],
                            amount_paise=row[3],
                            status=row[4],
                            created_at=self._to_naive_utc(row[5]) or datetime.utcnow(),
                            updated_at=self._to_naive_utc(row[6]) or datetime.utcnow(),
                            upi_uri=row[7],
                            qr_image_url=row[8],
                            upi_transaction_id=row[9],
                            payer_upi_id=row[10],
                            razorpay_order_id=row[11],
                            razorpay_payment_id=row[12],
                            checkout_key=row[13],
                            checkout_url=row[14],
                            admin_note=row[15],
                            confirmed_by=row[16],
                            confirmed_at=self._to_naive_utc(row[17]),
                        )
                        self.payments[payment.payment_id] = payment

                    cur.execute(
                        """
                        SELECT rider_id, from_status, to_status, changed_by, note, source, payment_id, created_at
                        FROM rider_status_history
                        ORDER BY created_at ASC
                        """
                    )
                    for row in cur.fetchall():
                        record = AccountStatusHistoryRecord(
                            rider_id=row[0],
                            from_status=row[1],
                            to_status=row[2],
                            changed_by=row[3],
                            note=row[4],
                            source=row[5] or "manual",
                            payment_id=row[6],
                            changed_at=self._to_naive_utc(row[7]) or datetime.utcnow(),
                        )
                        self.status_history.setdefault(record.rider_id, []).append(record)

                    cur.execute("SELECT phone, otp, expires_at FROM otps")
                    now = datetime.utcnow()
                    for row in cur.fetchall():
                        expires_at = self._to_naive_utc(row[2])
                        if expires_at and expires_at > now:
                            self.otps[row[0]] = {"otp": row[1], "expires_at": expires_at}

            self._refresh_portfolio_totals()
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to load from DB: %s", exc)

    def _refresh_portfolio_totals(self) -> None:
        active_policies = [p for p in self.policies.values() if p.status == "active"]
        total_premiums = sum(p.next_premium for p in active_policies)
        self.weekly_premiums_paise = total_premiums if total_premiums > 0 else 150_000

        self.weekly_payouts_paise = sum(
            claim.amount_paise for claim in self.claims.values() if claim.status in {"approved", "paid"}
        )

    def _upsert_rider(self, rider: RiderRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO riders (
                            rider_id,
                            phone,
                            vehicle_number,
                            legal_name,
                            password_hash,
                            is_verified,
                            verified_by,
                            verified_at,
                            platform,
                            pin_code,
                            zones_json,
                            shift_windows_json,
                            upi_id,
                            activity_summary_json,
                            account_status,
                            account_flags_json,
                            account_note,
                            phone_verified_at,
                            payment_submitted_at,
                            payment_confirmed_at
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (rider_id) DO UPDATE SET
                            phone = EXCLUDED.phone,
                            vehicle_number = EXCLUDED.vehicle_number,
                            legal_name = EXCLUDED.legal_name,
                            password_hash = EXCLUDED.password_hash,
                            is_verified = EXCLUDED.is_verified,
                            verified_by = EXCLUDED.verified_by,
                            verified_at = EXCLUDED.verified_at,
                            platform = EXCLUDED.platform,
                            pin_code = EXCLUDED.pin_code,
                            zones_json = EXCLUDED.zones_json,
                            shift_windows_json = EXCLUDED.shift_windows_json,
                            upi_id = EXCLUDED.upi_id,
                            activity_summary_json = EXCLUDED.activity_summary_json,
                            account_status = EXCLUDED.account_status,
                            account_flags_json = EXCLUDED.account_flags_json,
                            account_note = EXCLUDED.account_note,
                            phone_verified_at = EXCLUDED.phone_verified_at,
                            payment_submitted_at = EXCLUDED.payment_submitted_at,
                            payment_confirmed_at = EXCLUDED.payment_confirmed_at,
                            updated_at = NOW()
                        """,
                        (
                            rider.rider_id,
                            rider.phone,
                            rider.vehicle_number,
                            rider.legal_name,
                            rider.password_hash,
                            rider.is_verified,
                            rider.verified_by,
                            self._to_aware_utc(rider.verified_at),
                            rider.platform,
                            rider.pin_code,
                            Jsonb(rider.zones),
                            Jsonb(rider.shift_windows),
                            rider.upi_id,
                            Jsonb(rider.activity_summary),
                            rider.account_status,
                            Jsonb(rider.account_flags),
                            rider.account_note,
                            self._to_aware_utc(rider.phone_verified_at),
                            self._to_aware_utc(rider.payment_submitted_at),
                            self._to_aware_utc(rider.payment_confirmed_at),
                        ),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to upsert rider %s: %s", rider.rider_id, exc)

    def _upsert_policy(self, policy: PolicyRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO policies (policy_id, rider_id, status, week_start, week_end, next_premium)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (policy_id) DO UPDATE SET
                            rider_id = EXCLUDED.rider_id,
                            status = EXCLUDED.status,
                            week_start = EXCLUDED.week_start,
                            week_end = EXCLUDED.week_end,
                            next_premium = EXCLUDED.next_premium,
                            updated_at = NOW()
                        """,
                        (
                            policy.policy_id,
                            policy.rider_id,
                            policy.status,
                            self._to_aware_utc(policy.week_start),
                            self._to_aware_utc(policy.week_end),
                            policy.next_premium,
                        ),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to upsert policy %s: %s", policy.policy_id, exc)

    def _upsert_claim(self, claim: ClaimRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO claims (
                            claim_id,
                            rider_id,
                            trigger_type,
                            amount_paise,
                            status,
                            fraud_score,
                            fraud_checks,
                            trigger_event,
                            created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (claim_id) DO UPDATE SET
                            rider_id = EXCLUDED.rider_id,
                            trigger_type = EXCLUDED.trigger_type,
                            amount_paise = EXCLUDED.amount_paise,
                            status = EXCLUDED.status,
                            fraud_score = EXCLUDED.fraud_score,
                            fraud_checks = EXCLUDED.fraud_checks,
                            trigger_event = EXCLUDED.trigger_event,
                            updated_at = NOW()
                        """,
                        (
                            claim.id,
                            claim.rider_id,
                            claim.trigger_type,
                            claim.amount_paise,
                            claim.status,
                            claim.fraud_score,
                            Jsonb(claim.fraud_checks),
                            Jsonb(claim.trigger_event),
                            self._to_aware_utc(claim.created_at),
                        ),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to upsert claim %s: %s", claim.id, exc)

    def _upsert_trigger_event(self, event: TriggerEventRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO trigger_events (
                            event_id,
                            trigger_type,
                            zone,
                            metric,
                            threshold,
                            observed_at,
                            status,
                            affected_riders
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (event_id) DO UPDATE SET
                            trigger_type = EXCLUDED.trigger_type,
                            zone = EXCLUDED.zone,
                            metric = EXCLUDED.metric,
                            threshold = EXCLUDED.threshold,
                            observed_at = EXCLUDED.observed_at,
                            status = EXCLUDED.status,
                            affected_riders = EXCLUDED.affected_riders
                        """,
                        (
                            event.event_id,
                            event.trigger_type,
                            event.zone,
                            event.metric,
                            event.threshold,
                            self._to_aware_utc(event.observed_at),
                            event.status,
                            event.affected_riders,
                        ),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to upsert trigger event %s: %s", event.event_id, exc)

    def _upsert_payment(self, payment: PaymentRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO payments (
                            payment_id,
                            rider_id,
                            provider,
                            amount_paise,
                            status,
                            created_at,
                            updated_at,
                            upi_uri,
                            qr_image_url,
                            upi_transaction_id,
                            payer_upi_id,
                            razorpay_order_id,
                            razorpay_payment_id,
                            checkout_key,
                            checkout_url,
                            admin_note,
                            confirmed_by,
                            confirmed_at
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (payment_id) DO UPDATE SET
                            rider_id = EXCLUDED.rider_id,
                            provider = EXCLUDED.provider,
                            amount_paise = EXCLUDED.amount_paise,
                            status = EXCLUDED.status,
                            updated_at = EXCLUDED.updated_at,
                            upi_uri = EXCLUDED.upi_uri,
                            qr_image_url = EXCLUDED.qr_image_url,
                            upi_transaction_id = EXCLUDED.upi_transaction_id,
                            payer_upi_id = EXCLUDED.payer_upi_id,
                            razorpay_order_id = EXCLUDED.razorpay_order_id,
                            razorpay_payment_id = EXCLUDED.razorpay_payment_id,
                            checkout_key = EXCLUDED.checkout_key,
                            checkout_url = EXCLUDED.checkout_url,
                            admin_note = EXCLUDED.admin_note,
                            confirmed_by = EXCLUDED.confirmed_by,
                            confirmed_at = EXCLUDED.confirmed_at
                        """,
                        (
                            payment.payment_id,
                            payment.rider_id,
                            payment.provider,
                            payment.amount_paise,
                            payment.status,
                            self._to_aware_utc(payment.created_at),
                            self._to_aware_utc(payment.updated_at),
                            payment.upi_uri,
                            payment.qr_image_url,
                            payment.upi_transaction_id,
                            payment.payer_upi_id,
                            payment.razorpay_order_id,
                            payment.razorpay_payment_id,
                            payment.checkout_key,
                            payment.checkout_url,
                            payment.admin_note,
                            payment.confirmed_by,
                            self._to_aware_utc(payment.confirmed_at),
                        ),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to upsert payment %s: %s", payment.payment_id, exc)

    def _insert_status_history(self, record: AccountStatusHistoryRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO rider_status_history (
                            rider_id,
                            from_status,
                            to_status,
                            changed_by,
                            note,
                            source,
                            payment_id,
                            created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            record.rider_id,
                            record.from_status,
                            record.to_status,
                            record.changed_by,
                            record.note,
                            record.source,
                            record.payment_id,
                            self._to_aware_utc(record.changed_at),
                        ),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to insert status history for rider %s: %s", record.rider_id, exc)

    def _add_to_fraud_queue(self, claim_id: str) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO fraud_queue (claim_id) VALUES (%s) ON CONFLICT DO NOTHING",
                        (claim_id,),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to add claim %s to fraud queue: %s", claim_id, exc)

    def _remove_from_fraud_queue(self, claim_id: str) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM fraud_queue WHERE claim_id = %s", (claim_id,))
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to remove claim %s from fraud queue: %s", claim_id, exc)

    def _fetch_rider_by_phone(self, phone: str) -> Optional[RiderRecord]:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT
                            rider_id,
                            phone,
                            vehicle_number,
                            legal_name,
                            password_hash,
                            is_verified,
                            verified_by,
                            verified_at,
                            platform,
                            pin_code,
                            zones_json,
                            shift_windows_json,
                            upi_id,
                            activity_summary_json,
                            account_status,
                            account_flags_json,
                            account_note,
                            phone_verified_at,
                            payment_submitted_at,
                            payment_confirmed_at
                        FROM riders
                        WHERE phone = %s
                        """,
                        (phone,),
                    )
                    row = cur.fetchone()
            if not row:
                return None
            return RiderRecord(
                rider_id=row[0],
                phone=row[1],
                vehicle_number=row[2],
                legal_name=row[3],
                password_hash=row[4],
                is_verified=bool(row[5]),
                verified_by=row[6],
                verified_at=self._to_naive_utc(row[7]),
                platform=row[8],
                pin_code=row[9],
                zones=self._json_list(row[10]),
                shift_windows=self._json_list(row[11]),
                upi_id=row[12],
                activity_summary=self._json_dict(row[13]),
                account_status=row[14] if row[14] in ACCOUNT_STATUS_OPTIONS else "O1_OTP_SENT_NOT_VERIFIED",
                account_flags=self._json_dict(row[15]),
                account_note=row[16],
                phone_verified_at=self._to_naive_utc(row[17]),
                payment_submitted_at=self._to_naive_utc(row[18]),
                payment_confirmed_at=self._to_naive_utc(row[19]),
            )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to fetch rider by phone: %s", exc)
            return None

    def _fetch_rider_by_id(self, rider_id: str) -> Optional[RiderRecord]:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT
                            rider_id,
                            phone,
                            vehicle_number,
                            legal_name,
                            password_hash,
                            is_verified,
                            verified_by,
                            verified_at,
                            platform,
                            pin_code,
                            zones_json,
                            shift_windows_json,
                            upi_id,
                            activity_summary_json,
                            account_status,
                            account_flags_json,
                            account_note,
                            phone_verified_at,
                            payment_submitted_at,
                            payment_confirmed_at
                        FROM riders
                        WHERE rider_id = %s
                        """,
                        (rider_id,),
                    )
                    row = cur.fetchone()
            if not row:
                return None
            return RiderRecord(
                rider_id=row[0],
                phone=row[1],
                vehicle_number=row[2],
                legal_name=row[3],
                password_hash=row[4],
                is_verified=bool(row[5]),
                verified_by=row[6],
                verified_at=self._to_naive_utc(row[7]),
                platform=row[8],
                pin_code=row[9],
                zones=self._json_list(row[10]),
                shift_windows=self._json_list(row[11]),
                upi_id=row[12],
                activity_summary=self._json_dict(row[13]),
                account_status=row[14] if row[14] in ACCOUNT_STATUS_OPTIONS else "O1_OTP_SENT_NOT_VERIFIED",
                account_flags=self._json_dict(row[15]),
                account_note=row[16],
                phone_verified_at=self._to_naive_utc(row[17]),
                payment_submitted_at=self._to_naive_utc(row[18]),
                payment_confirmed_at=self._to_naive_utc(row[19]),
            )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to fetch rider by id: %s", exc)
            return None

    def _persist_new_status_history(self, rider_id: str, previous_len: int) -> None:
        history = self.status_history.get(rider_id, [])
        if previous_len < 0:
            previous_len = 0
        for record in history[previous_len:]:
            self._insert_status_history(record)

    def _ensure_initial_status_history(self, rider: RiderRecord, changed_by: str, source: str, note: str) -> None:
        current = self.status_history.get(rider.rider_id)
        if current:
            return

        record = AccountStatusHistoryRecord(
            rider_id=rider.rider_id,
            from_status=None,
            to_status=rider.account_status,
            changed_by=changed_by,
            changed_at=datetime.utcnow(),
            note=note,
            source=source,
        )
        self.status_history[rider.rider_id] = [record]
        self._insert_status_history(record)

    def _get_or_create_rider(self, phone: str) -> str:
        in_memory = self.get_rider_by_phone(phone)
        if in_memory:
            return in_memory.rider_id

        rider_id = f"rider-{random.randint(1000, 9999)}"
        while rider_id in self.riders:
            rider_id = f"rider-{random.randint(1000, 9999)}"

        rider = RiderRecord(
            rider_id=rider_id,
            phone=phone,
            account_status="O1_OTP_SENT_NOT_VERIFIED",
            account_flags={"otp_sent": True},
        )
        self.riders[rider_id] = rider
        self._upsert_rider(rider)
        self._ensure_initial_status_history(
            rider,
            changed_by="system_auth",
            source="signup",
            note="Rider created from OTP flow",
        )
        return rider_id

    def ensure_rider(self, rider_id: str, phone: Optional[str] = None) -> RiderRecord:
        rider = self.riders.get(rider_id)
        if rider:
            if phone and rider.phone != phone:
                rider.phone = phone
                self._upsert_rider(rider)
            return rider

        db_rider = self._fetch_rider_by_id(rider_id)
        if db_rider:
            self.riders[db_rider.rider_id] = db_rider
            return db_rider

        restored_phone = phone or "+91 00000 00000"
        rider = RiderRecord(rider_id=rider_id, phone=restored_phone)
        self.riders[rider_id] = rider
        self._upsert_rider(rider)
        self._ensure_initial_status_history(
            rider,
            changed_by="system",
            source="restore",
            note="Rider restored by ensure_rider",
        )
        return rider

    def get_rider_by_phone(self, phone: str) -> Optional[RiderRecord]:
        rider = super().get_rider_by_phone(phone)
        if rider:
            return rider

        fetched = self._fetch_rider_by_phone(phone)
        if fetched:
            self.riders[fetched.rider_id] = fetched
            return fetched
        return None

    def issue_otp(self, phone: str) -> str:
        otp = "123456"
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        self.otps[phone] = {"otp": otp, "expires_at": expires_at}

        rider = self.get_rider_by_phone(phone)
        before_len = len(self.status_history.get(rider.rider_id, [])) if rider else 0

        rider_id = self._get_or_create_rider(phone)
        rider = self.ensure_rider(rider_id, phone)
        rider.account_flags["otp_sent"] = True
        self._set_rider_account_status(
            rider,
            "O1_OTP_SENT_NOT_VERIFIED",
            changed_by="system_auth",
            source="otp",
            note="OTP issued",
        )

        self._upsert_rider(rider)
        self._persist_new_status_history(rider.rider_id, before_len)

        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO otps (phone, otp, expires_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (phone) DO UPDATE SET
                            otp = EXCLUDED.otp,
                            expires_at = EXCLUDED.expires_at,
                            updated_at = NOW()
                        """,
                        (phone, otp, self._to_aware_utc(expires_at)),
                    )
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.error("Failed to persist OTP for %s: %s", phone, exc)

        print(f"NEW - OTP : {otp}")
        return otp

    def verify_otp(self, phone: str, otp: str) -> str:
        record = self.otps.get(phone)
        if record is None:
            try:
                with self._conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT otp, expires_at FROM otps WHERE phone = %s", (phone,))
                        row = cur.fetchone()
                if row:
                    record = {
                        "otp": row[0],
                        "expires_at": self._to_naive_utc(row[1]),
                    }
            except Exception as exc:  # pragma: no cover - defensive fallback
                logger.error("Failed to read OTP for %s: %s", phone, exc)

        if not record or record.get("otp") != otp or not record.get("expires_at") or record["expires_at"] < datetime.utcnow():
            raise ValueError("Invalid or expired OTP")

        rider_id = self._get_or_create_rider(phone)
        rider = self.ensure_rider(rider_id, phone)
        before_len = len(self.status_history.get(rider.rider_id, []))

        rider.account_flags["otp_verified"] = True
        rider.phone_verified_at = datetime.utcnow()
        self._set_rider_account_status(
            rider,
            "O2_OTP_VERIFIED_PROFILE_PENDING",
            changed_by="system_auth",
            source="otp",
            note="Phone OTP verified",
        )

        self._upsert_rider(rider)
        self._persist_new_status_history(rider.rider_id, before_len)
        return rider_id

    def complete_signup(self, rider_id: str, legal_name: str, vehicle_number: str, password_hash: str) -> RiderRecord:
        before_len = len(self.status_history.get(rider_id, []))
        rider = super().complete_signup(rider_id, legal_name, vehicle_number, password_hash)
        self._upsert_rider(rider)
        self._persist_new_status_history(rider.rider_id, before_len)
        return rider

    def mark_rider_verified(self, rider_id: str, admin_id: str) -> RiderRecord:
        rider = super().mark_rider_verified(rider_id, admin_id)
        self._upsert_rider(rider)
        return rider

    def link_platform(self, rider_id: str, platform: str):
        before_len = len(self.status_history.get(rider_id, []))
        summary = super().link_platform(rider_id, platform)
        self._upsert_rider(self.riders[rider_id])
        self._persist_new_status_history(rider_id, before_len)
        return summary

    def update_profile(
        self,
        rider_id: str,
        pin_code: str,
        zones: list[str],
        shift_windows: list[str],
        upi_id: Optional[str],
    ) -> None:
        before_len = len(self.status_history.get(rider_id, []))
        super().update_profile(rider_id, pin_code, zones, shift_windows, upi_id)
        self._upsert_rider(self.riders[rider_id])
        self._persist_new_status_history(rider_id, before_len)

    def activate_policy(self, rider_id: str, upi_id: str) -> PolicyRecord:
        before_len = len(self.status_history.get(rider_id, []))
        policy = super().activate_policy(rider_id, upi_id)
        self._upsert_rider(self.riders[rider_id])
        self._upsert_policy(policy)
        self._persist_new_status_history(rider_id, before_len)
        self._refresh_portfolio_totals()
        return policy

    def set_rider_account_status(self, rider_id: str, account_status: str, note: Optional[str] = None) -> RiderRecord:
        before_len = len(self.status_history.get(rider_id, []))
        rider = super().set_rider_account_status(rider_id, account_status, note)
        self._upsert_rider(rider)
        self._persist_new_status_history(rider_id, before_len)
        return rider

    def create_upi_qr_payment(self, rider_id: str, upi_id: str, amount_paise: int, note: Optional[str] = None) -> PaymentRecord:
        before_len = len(self.status_history.get(rider_id, []))
        payment = super().create_upi_qr_payment(rider_id, upi_id, amount_paise, note)
        self._upsert_payment(payment)
        self._upsert_rider(self.riders[rider_id])
        self._persist_new_status_history(rider_id, before_len)
        return payment

    def submit_upi_qr_transaction(
        self,
        payment_id: str,
        rider_id: str,
        upi_transaction_id: str,
        payer_upi_id: str,
    ) -> PaymentRecord:
        before_len = len(self.status_history.get(rider_id, []))
        payment = super().submit_upi_qr_transaction(payment_id, rider_id, upi_transaction_id, payer_upi_id)
        self._upsert_payment(payment)
        self._upsert_rider(self.riders[rider_id])
        self._persist_new_status_history(rider_id, before_len)
        return payment

    async def create_razorpay_payment(self, rider_id: str, amount_paise: int, upi_id: Optional[str] = None) -> PaymentRecord:
        before_len = len(self.status_history.get(rider_id, []))
        payment = await super().create_razorpay_payment(rider_id, amount_paise, upi_id)
        self._upsert_payment(payment)
        self._upsert_rider(self.riders[rider_id])
        self._persist_new_status_history(rider_id, before_len)
        return payment

    def confirm_payment(
        self,
        payment_id: str,
        admin_id: str,
        approve: bool,
        admin_note: Optional[str] = None,
        account_status: Optional[str] = None,
    ) -> PaymentRecord:
        payment = self.payments.get(payment_id)
        rider_id = payment.rider_id if payment else None
        before_len = len(self.status_history.get(rider_id, [])) if rider_id else 0

        result = super().confirm_payment(payment_id, admin_id, approve, admin_note, account_status)
        self._upsert_payment(result)

        rider = self.riders.get(result.rider_id)
        if rider:
            self._upsert_rider(rider)
            self._persist_new_status_history(rider.rider_id, before_len)

        return result

    def approve_claim(self, claim_id: str, note: Optional[str]) -> None:
        super().approve_claim(claim_id, note)
        claim = self.claims.get(claim_id)
        if claim:
            self._upsert_claim(claim)
        self._remove_from_fraud_queue(claim_id)
        self._refresh_portfolio_totals()

    def reject_claim(self, claim_id: str, reason: Optional[str]) -> None:
        super().reject_claim(claim_id, reason)
        claim = self.claims.get(claim_id)
        if claim:
            self._upsert_claim(claim)
        self._remove_from_fraud_queue(claim_id)

    def fire_trigger(
        self,
        trigger_type: str,
        zone: str,
        metric: float,
        threshold: str,
        affected_rider_ids: list[str],
    ) -> TriggerEventRecord:
        event = super().fire_trigger(trigger_type, zone, metric, threshold, affected_rider_ids)
        self._upsert_trigger_event(event)
        return event

    def create_claim_for_rider(self, rider_id: str, trigger_event: TriggerEventRecord, amount_paise: int) -> ClaimRecord:
        claim = super().create_claim_for_rider(rider_id, trigger_event, amount_paise)
        self._upsert_claim(claim)
        self._upsert_trigger_event(trigger_event)
        if claim.status == "held":
            self._add_to_fraud_queue(claim.id)
        else:
            self._remove_from_fraud_queue(claim.id)
        self._refresh_portfolio_totals()
        return claim

    def fire_demo_trigger(self, pin_code: str, trigger_type: str) -> TriggerEventRecord:
        before_claim_ids = set(self.claims.keys())
        event = super().fire_demo_trigger(pin_code, trigger_type)
        self._upsert_trigger_event(event)

        new_claim_ids = [claim_id for claim_id in self.claims.keys() if claim_id not in before_claim_ids]
        for claim_id in new_claim_ids:
            claim = self.claims[claim_id]
            self._upsert_claim(claim)
            if claim.status == "held":
                self._add_to_fraud_queue(claim_id)
            else:
                self._remove_from_fraud_queue(claim_id)

        self._refresh_portfolio_totals()
        return event
