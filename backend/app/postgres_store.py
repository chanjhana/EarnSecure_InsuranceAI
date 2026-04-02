"""PostgreSQL-backed state store for demo persistence."""
from __future__ import annotations

import json
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import psycopg

from .storage import InMemoryStore, RiderRecord


class PostgresBackedStore(InMemoryStore):
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        super().__init__()
        self._bootstrap_schema()
        self._ping()
        self._seed_existing_riders_to_db()

    def _conn(self):
        return psycopg.connect(self.database_url)

    def _bootstrap_schema(self) -> None:
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

    def _ping(self) -> None:
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                _ = cur.fetchone()

    def _seed_existing_riders_to_db(self) -> None:
        for rider in self.riders.values():
            self._upsert_rider(rider)

    def _upsert_rider(self, rider: RiderRecord) -> None:
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

    def _fetch_rider_by_phone(self, phone: str) -> Optional[RiderRecord]:
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
        otp = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
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
        print(f"NEW - OTP : {otp}")
        return otp

    def verify_otp(self, phone: str, otp: str) -> str:
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
        rider_id = self._get_or_create_rider(phone)
        return rider_id

    def link_platform(self, rider_id: str, platform: str):
        summary = super().link_platform(rider_id, platform)
        self._upsert_rider(self.riders[rider_id])
        return summary

    def update_profile(self, rider_id: str, pin_code: str, zones: list[str], shift_windows: list[str], upi_id: Optional[str]) -> None:
        super().update_profile(rider_id, pin_code, zones, shift_windows, upi_id)
        self._upsert_rider(self.riders[rider_id])

    def activate_policy(self, rider_id: str, upi_id: str):
        policy = super().activate_policy(rider_id, upi_id)
        self._upsert_rider(self.riders[rider_id])
        return policy