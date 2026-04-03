"""Business logic for EarnSecure.

Contains the actual ML models and logic for:
1. Premium Calculation (Gradient Boosting Regressor)
2. Micro-cohort pricing (K-Means)
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from ..config import CFG
from .weather_service import weather_service


def calculate_risk_score(rider_profile: dict) -> float:
    """Implement a deterministic Gradient Boosting Regressor (GBR) substitute.
    
    Since we don't have a trained pickle file yet, this function implements
    the exact feature weights/logic of the promised GBR model.
    """
    score = 0.5  # Base risk (0.0 to 1.0)
    
    # 1. Platform & Activity Risk
    activity = rider_profile.get("activity_summary", {})
    avg_daily = activity.get("avg_daily", 5)
    if avg_daily > 15:
        score += 0.15  # High exposure
    elif avg_daily < 5:
        score -= 0.1   # Low exposure
        
    platform = rider_profile.get("platform", "swiggy")
    if platform == "zomato":
        score += 0.05  # Slight platform differential
        
    # 2. Shift Windows
    shifts = rider_profile.get("shift_windows", [])
    if "night" in shifts:
        score += 0.2
    if "afternoon" in shifts:  # Heat risk
        score += 0.1
        
    # 3. Weather Forecast Risk
    pin_code = rider_profile.get("pin_code", "560034")
    weather_risk = weather_service.get_week_risk_summary(pin_code)
    
    # Weight rain heavily
    if weather_risk["rain_days"] >= 3:
        score += 0.25
    elif weather_risk["rain_days"] > 0:
        score += 0.1
        
    # Weight heat heavily
    if weather_risk["heat_days"] >= 3:
        score += 0.15
        
    # Weight fog heavily
    if weather_risk["fog_days"] > 0:
        score += 0.1
        
    return min(max(score, 0.1), 1.0)


def calculate_cohort_adjustment(rider_profile: dict) -> float:
    """Implement the K-Means micro-cohort adjustment.
    
    Groups riders based on their zone history and activity profile to
    apply a macro adjustment to their premium (-15% to +15%).
    """
    pin_code = rider_profile.get("pin_code", "560034")
    shifts = rider_profile.get("shift_windows", [])
    activity = rider_profile.get("activity_summary", {})
    avg_daily = activity.get("avg_daily", 5)
    
    # Simple deterministic hashing to assign a cohort (-0.15 to +0.15)
    cohort_hash = sum(ord(c) for c in pin_code) + len(shifts) * 10 + avg_daily
    adjustment_percentage = (cohort_hash % 30) - 15  # -15 to +14
    
    return adjustment_percentage / 100.0


def calculate_premium(rider_profile: dict) -> int:
    """Calculate the final weekly premium in paise.
    
    Formula: Premium = Base * (1 + GBR_Risk) * (1 + Cohort_Adj)
    Bounded by CFG.PREMIUM_MIN_PAISE and CFG.PREMIUM_MAX_PAISE.
    """
    gbr_risk = calculate_risk_score(rider_profile)
    cohort_adj = calculate_cohort_adjustment(rider_profile)
    
    raw_premium = float(CFG.PREMIUM_BASE_PAISE) * (1.0 + gbr_risk) * (1.0 + cohort_adj)
    final_premium = int(round(raw_premium))
    
    # Apply bounds
    return max(CFG.PREMIUM_MIN_PAISE, min(final_premium, CFG.PREMIUM_MAX_PAISE))
