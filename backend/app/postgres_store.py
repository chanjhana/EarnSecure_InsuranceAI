"""PostgreSQL-backed state store for demo persistence."""
from __future__ import annotations

import json
import logging
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import psycopg

from .storage import InMemoryStore, RiderRecord, PolicyRecord, ClaimRecord, TriggerEventRecord

logger = logging.getLogger("earnsecure.postgres")

class PostgresBackedStore(InMemoryStore):
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        super().__init__()
        self._bootstrap_schema()
        self._ping()
        self._load_all_from_db()
        self._seed_existing_riders_to_db()

    def _conn(self):
        return psycopg.connect(self.database_url)

    def _bootstrap_schema(self) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS riders (
                            rider_id TEXT PRIMARY KEY,
                            phone TEXT NOT NULL,
                            platform TEXT,
                            pin_code TEXT,
                            zones_json TEXT,
                            shift_windows_json TEXT,
                            upi_id TEXT,
                            activity_summary_json TEXT,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
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
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS claims (
                            claim_id TEXT PRIMARY KEY,
                            rider_id TEXT NOT NULL,
                            trigger_type TEXT NOT NULL,
                            amount_paise INTEGER NOT NULL,
                            status TEXT NOT NULL DEFAULT 'approved',
                            fraud_score REAL NOT NULL DEFAULT 0.0,
                            fraud_checks JSONB NOT NULL DEFAULT '{}',
                            trigger_event JSONB NOT NULL DEFAULT '{}',
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
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
        except Exception as e:
            logger.error(f"Failed to bootstrap schema: {e}")

    def _ping(self) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    _ = cur.fetchone()
        except Exception as e:
            logger.error(f"Postgres ping failed: {e}")

    def _load_all_from_db(self) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    # 1. Load Policies
                    cur.execute("SELECT policy_id, rider_id, status, week_start, week_end, next_premium FROM policies")
                    policies_loaded = 0
                    for row in cur.fetchall():
                        policy = PolicyRecord(
                            policy_id=row[0],
                            rider_id=row[1],
                            status=row[2],
                            week_start=row[3] if isinstance(row[3], datetime) else datetime.fromisoformat(row[3]),
                            week_end=row[4] if isinstance(row[4], datetime) else datetime.fromisoformat(row[4]),
                            next_premium=row[5]
                        )
                        self.policies[policy.policy_id] = policy
                        if policy.status == "active":
                            self.rider_policy_index[policy.rider_id] = policy.policy_id
                        policies_loaded += 1

                    # 2. Load Claims
                    cur.execute("SELECT claim_id, rider_id, trigger_type, amount_paise, status, fraud_score, fraud_checks, trigger_event, created_at FROM claims")
                    claims_loaded = 0
                    for row in cur.fetchall():
                        claim = ClaimRecord(
                            id=row[0],
                            rider_id=row[1],
                            trigger_type=row[2],
                            amount_paise=row[3],
                            status=row[4],
                            fraud_score=row[5],
                            fraud_checks=row[6] if isinstance(row[6], dict) else json.loads(row[6]),
                            trigger_event=row[7] if isinstance(row[7], dict) else json.loads(row[7]),
                            created_at=row[8] if isinstance(row[8], datetime) else datetime.fromisoformat(row[8])
                        )
                        self.claims[claim.id] = claim
                        if claim.status in ["approved", "paid"]:
                            self.weekly_payouts_paise += claim.amount_paise
                        claims_loaded += 1

                    # 3. Load Fraud Queue
                    cur.execute("SELECT claim_id FROM fraud_queue")
                    fraud_queue_loaded = 0
                    for row in cur.fetchall():
                        if row[0] not in self.fraud_queue:
                            self.fraud_queue.append(row[0])
                            fraud_queue_loaded += 1

                    # 4. Load Trigger Events
                    cur.execute("SELECT event_id, trigger_type, zone, metric, threshold, observed_at, status, affected_riders FROM trigger_events")
                    events_loaded = 0
                    self.trigger_events = []
                    for row in cur.fetchall():
                        event = TriggerEventRecord(
                            event_id=row[0],
                            trigger_type=row[1],
                            zone=row[2],
                            metric=row[3],
                            threshold=row[4],
                            observed_at=row[5] if isinstance(row[5], datetime) else datetime.fromisoformat(row[5]),
                            status=row[6],
                            affected_riders=row[7]
                        )
                        self.trigger_events.append(event)
                        events_loaded += 1

            logger.info(f"Loaded from DB: {policies_loaded} policies, {claims_loaded} claims, {fraud_queue_loaded} in fraud queue, {events_loaded} trigger events.")
        except Exception as e:
            logger.error(f"Failed to load from DB: {e}")

    def _seed_existing_riders_to_db(self) -> None:
        for rider in self.riders.values():
            self._upsert_rider(rider)

    def _upsert_rider(self, rider: RiderRecord) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO riders (
                            rider_id, phone, platform, pin_code, zones_json, shift_windows_json, upi_id, activity_summary_json
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (rider_id) DO UPDATE SET
                            phone = EXCLUDED.phone,
                            platform = EXCLUDED.platform,
                            pin_code = EXCLUDED.pin_code,
                            zones_json = EXCLUDED.zones_json,
                            shift_windows_json = EXCLUDED.shift_windows_json,
                            upi_id = EXCLUDED.upi_id,
                            activity_summary_json = EXCLUDED.activity_summary_json,
                            updated_at = NOW()
                        """,
                        (
                            rider.rider_id,
                            rider.phone,
                            rider.platform,
                            rider.pin_code,
                            json.dumps(rider.zones),
                            json.dumps(rider.shift_windows),
                            rider.upi_id,
                            json.dumps(rider.activity_summary),
                        ),
                    )
        except Exception as e:
            logger.error(f"Failed to upsert rider: {e}")

    def _fetch_rider_by_phone(self, phone: str) -> Optional[RiderRecord]:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT rider_id, phone, platform, pin_code, zones_json, shift_windows_json, upi_id, activity_summary_json
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
                platform=row[2],
                pin_code=row[3],
                zones=json.loads(row[4] or "[]"),
                shift_windows=json.loads(row[5] or "[]"),
                upi_id=row[6],
                activity_summary=json.loads(row[7] or "{}"),
            )
        except Exception as e:
            logger.error(f"Failed to fetch rider by phone: {e}")
            return None

    def _get_or_create_rider(self, phone: str) -> str:
        existing = self._fetch_rider_by_phone(phone)
        if existing:
            self.riders[existing.rider_id] = existing
            return existing.rider_id

        new_id = f"rider-{random.randint(100, 999)}"
        while new_id in self.riders:
            new_id = f"rider-{random.randint(100, 999)}"
        rider = RiderRecord(rider_id=new_id, phone=phone)
        self.riders[new_id] = rider
        self._upsert_rider(rider)
        return new_id

    def ensure_rider(self, rider_id: str, phone: Optional[str] = None) -> RiderRecord:
        rider = self.riders.get(rider_id)
        if rider:
            if phone and not rider.phone:
                rider.phone = phone
                self._upsert_rider(rider)
            return rider

        if phone:
            by_phone = self._fetch_rider_by_phone(phone)
            if by_phone:
                self.riders[by_phone.rider_id] = by_phone
                return by_phone

        restored_phone = phone or "+91 00000 00000"
        rider = RiderRecord(rider_id=rider_id, phone=restored_phone)
        self.riders[rider_id] = rider
        self._upsert_rider(rider)
        return rider

    def issue_otp(self, phone: str) -> str:
        # Hackathon demo override
        otp = "123456"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
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
                        (phone, otp, expires_at),
                    )
        except Exception as e:
            logger.error(f"Failed to issue OTP: {e}")
            self.otps[phone] = {"otp": otp, "expires_at": expires_at}
        print(f"NEW - OTP : {otp}")
        return otp

    def verify_otp(self, phone: str, otp: str) -> str:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT otp, expires_at FROM otps WHERE phone = %s", (phone,))
                    row = cur.fetchone()
            if not row:
                raise ValueError("Invalid or expired OTP")

            saved_otp, expires_at = row
            now = datetime.now(timezone.utc)
            if saved_otp != otp or expires_at < now:
                raise ValueError("Invalid or expired OTP")
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to verify OTP from DB, falling back to in-memory: {e}")
            record = self.otps.get(phone)
            if not record or record["otp"] != otp or record["expires_at"] < datetime.now(timezone.utc).replace(tzinfo=None):
                raise ValueError("Invalid or expired OTP")

        rider_id = self._get_or_create_rider(phone)
        return rider_id

    def link_platform(self, rider_id: str, platform: str):
        summary = super().link_platform(rider_id, platform)
        self._upsert_rider(self.riders[rider_id])
        return summary

    def update_profile(self, rider_id: str, pin_code: str, zones: list[str], shift_windows: list[str], upi_id: Optional[str]) -> None:
        super().update_profile(rider_id, pin_code, zones, shift_windows, upi_id)
        self._upsert_rider(self.riders[rider_id])


    # Overrides for Full Persistence

    def activate_policy(self, rider_id: str, upi_id: str) -> PolicyRecord:
        policy = super().activate_policy(rider_id, upi_id)
        self._upsert_rider(self.riders[rider_id])
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO policies (policy_id, rider_id, status, week_start, week_end, next_premium)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (policy_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            updated_at = NOW()
                        """,
                        (policy.policy_id, policy.rider_id, policy.status, policy.week_start.isoformat(), policy.week_end.isoformat(), policy.next_premium)
                    )
        except Exception as e:
            logger.error(f"Failed to activate policy in DB: {e}")
        return policy

    def _update_claim_status_in_db(self, claim_id: str, status: str, fraud_checks: dict) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE claims SET status = %s, fraud_checks = %s, updated_at = NOW() WHERE claim_id = %s
                        """,
                        (status, json.dumps(fraud_checks), claim_id)
                    )
        except Exception as e:
            logger.error(f"Failed to update claim status in DB: {e}")

    def _remove_from_fraud_queue_db(self, claim_id: str) -> None:
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM fraud_queue WHERE claim_id = %s", (claim_id,))
        except Exception as e:
            logger.error(f"Failed to remove from fraud queue DB: {e}")

    def approve_claim(self, claim_id: str, note: Optional[str]) -> None:
        super().approve_claim(claim_id, note)
        claim = self.claims[claim_id]
        self._update_claim_status_in_db(claim_id, claim.status, claim.fraud_checks)
        self._remove_from_fraud_queue_db(claim_id)

    def reject_claim(self, claim_id: str, reason: Optional[str]) -> None:
        super().reject_claim(claim_id, reason)
        claim = self.claims[claim_id]
        self._update_claim_status_in_db(claim_id, claim.status, claim.fraud_checks)
        self._remove_from_fraud_queue_db(claim_id)

    def fire_trigger(self, trigger_type: str, zone: str, metric: float, threshold: str, affected_rider_ids: list[str]) -> TriggerEventRecord:
        event = super().fire_trigger(trigger_type, zone, metric, threshold, affected_rider_ids)
        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO trigger_events (event_id, trigger_type, zone, metric, threshold, observed_at, status, affected_riders)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (event_id) DO UPDATE SET status = EXCLUDED.status
                        """,
                        (event.event_id, event.trigger_type, event.zone, event.metric, event.threshold, event.observed_at.isoformat(), event.status, event.affected_riders)
                    )
        except Exception as e:
            logger.error(f"Failed to save trigger event in DB: {e}")
        return event

    def create_claim_for_rider(self, rider_id: str, trigger_event: TriggerEventRecord, amount_paise: int) -> None:
        super().create_claim_for_rider(rider_id, trigger_event, amount_paise)
        
        # We need to find the claim that was just created.
        # Since InMemoryStore appends it to self.claims, we can find the most recent one for this event.
        claim = None
        for c in self.claims.values():
            if c.rider_id == rider_id and c.trigger_event.get("event_id") == trigger_event.event_id:
                claim = c
        
        if not claim:
            return

        try:
            with self._conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO claims (claim_id, rider_id, trigger_type, amount_paise, status, fraud_score, fraud_checks, trigger_event, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (claim.id, claim.rider_id, claim.trigger_type, claim.amount_paise, claim.status, claim.fraud_score, json.dumps(claim.fraud_checks), json.dumps(claim.trigger_event), claim.created_at.isoformat())
                    )
                    
                    if claim.status == "held":
                        cur.execute(
                            "INSERT INTO fraud_queue (claim_id) VALUES (%s) ON CONFLICT DO NOTHING",
                            (claim.id,)
                        )
                        
                    # update trigger event status if needed
                    cur.execute(
                        "UPDATE trigger_events SET status = %s WHERE event_id = %s",
                        (trigger_event.status, trigger_event.event_id)
                    )
        except Exception as e:
            logger.error(f"Failed to create claim in DB: {e}")