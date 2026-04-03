"""Centralised configuration — reads from environment / .env.local once at import time.

Every tunable constant lives here so that the rest of the codebase
never calls os.getenv() directly.  Values are intentionally kept as
plain module-level attributes (no class / dataclass) so they can be
imported with a simple ``from app.config import CFG``.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# ── Load .env.local next to the backend package ─────────────────────
_env_file = Path(__file__).resolve().parents[1] / ".env.local"
load_dotenv(_env_file)


class _Config:
    """Read-only configuration singleton."""

    # ── External API keys ───────────────────────────────────────────
    OPENWEATHERMAP_API_KEY: str = os.getenv("OPENWEATHERMAP_API_KEY", "")

    # ── Parametric trigger thresholds (from README §6) ──────────────
    RAIN_THRESHOLD_MM: float = 64.5        # daily rainfall
    HEAT_THRESHOLD_C: float = 45.0         # absolute temperature
    HEAT_INDEX_THRESHOLD_C: float = 41.0   # heat-index for 2 hrs
    AQI_THRESHOLD: int = 300               # CPCB "Very Poor"
    OUTAGE_THRESHOLD_MIN: int = 30         # platform down minutes
    FOG_VISIBILITY_M: int = 50             # visibility in metres
    FSSAI_CLOSURE_COUNT: int = 8           # restaurants sealed in zone

    # ── Payout amounts (paise) — Basic / Full tiers ────────────────
    PAYOUTS: dict[str, dict[str, int]] = {
        "rain":    {"basic": 30_000, "full": 60_000},
        "heat":    {"basic": 40_000, "full": 70_000},
        "aqi":     {"basic": 40_000, "full": 40_000},
        "outage":  {"basic": 30_000, "full": 50_000},
        "closure": {"basic": 40_000, "full": 40_000},
        "fog":     {"basic": 30_000, "full": 30_000},
    }

    # ── Premium bounds (paise) — ₹25 to ₹150 per week ─────────────
    PREMIUM_MIN_PAISE: int = 2_500
    PREMIUM_MAX_PAISE: int = 15_000
    PREMIUM_BASE_PAISE: int = 7_000  # midpoint anchor for GBR-like calc

    # ── Fraud score bands (from README §8) ─────────────────────────
    FRAUD_AUTO_APPROVE: float = 0.2
    FRAUD_WATCH: float = 0.6
    FRAUD_SUSPICIOUS: float = 0.9

    # ── Loss-ratio target band ─────────────────────────────────────
    LOSS_RATIO_LOW: float = 0.50
    LOSS_RATIO_HIGH: float = 0.80

    # ── Seasonal calendar (month → season label) ───────────────────
    SEASON_MAP: dict[int, str] = {
        1: "winter", 2: "winter", 3: "summer",
        4: "summer", 5: "summer", 6: "monsoon",
        7: "monsoon", 8: "monsoon", 9: "monsoon",
        10: "monsoon", 11: "winter", 12: "winter",
    }

    @property
    def has_weather_api(self) -> bool:
        return bool(self.OPENWEATHERMAP_API_KEY)


CFG = _Config()
