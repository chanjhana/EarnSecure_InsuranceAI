"""Fraud detection logic for EarnSecure.

Implements the 4-layer fraud detection architecture:
1. Hard rules (Platform API validation)
2. Geolocation validation (IP/GPS matching)
3. Behavioural Anomaly (Isolation Forest)
4. Collusion network checks (graph heuristic)
"""

from __future__ import annotations

import random
from typing import Dict, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest

from ..config import CFG

# ── Baseline Model Initialization ──────────────────────────────────────────

# Train a baseline Isolation Forest model on synthetic "normal" behavioral data.
# Normal patterns: 10-250 orders in 30 days, 2-12 hours avg daily
# Anomalous patterns: Extreme orders or avg_daily values (too high/low correlated)
_X_baseline = np.array([
    [120, 5.5], [200, 8.0], [50, 4.0], [180, 9.5], 
    [250, 11.0], [10, 2.0], [150, 7.5], [90, 6.0],
    [210, 8.5], [60, 4.5], [130, 6.5], [190, 9.0],
    [100, 5.0], [110, 6.0], [140, 7.0], [160, 8.0],
    [1000, 50.0], [0, 0.0], [500, 24.0] # Explicit outliers/anomalies to shape boundary
])

# Initialize the unsupervised Isolation Forest.
# Contamination is set to ~0.1 (expecting roughly 10% anomalies in the baseline set).
_iso_forest = IsolationForest(contamination=0.15, random_state=42)
_iso_forest.fit(_X_baseline)

def _check_isolation_forest_anomaly(d30_orders: int, avg_daily_hrs: float) -> bool:
    """Predicts if a rider's activity profile is anomalously high or low."""
    prediction = _iso_forest.predict(np.array([[d30_orders, avg_daily_hrs]]))
    return prediction[0] == -1  # -1 represents an outlier/anomaly

def evaluate_fraud_risk(claim_type: str, rider_profile: dict, event_data: dict) -> Tuple[float, Dict[str, bool]]:
    """Evaluate a claim for potential fraud.
    
    Returns:
        (fraud_score, checks_dict)
        fraud_score: 0.0 (safe) to 1.0 (fraudulent)
    """
    checks = {
        "platform_active": True,
        "gps_zone_match": True,
        "anomaly_free": True,
        "no_collusion": True
    }
    
    score = 0.0
    
    activity = rider_profile.get("activity_summary", {})
    d30_orders = activity.get("d30_orders", 0)
    avg_daily_hrs = activity.get("avg_daily", 0.0)

    # 1. Hard Rule: Platform Active
    # (In a real system we'd ping Swiggy/Zomato here. We'll use the mock data.)
    if d30_orders < 5:
        score += 0.3
        checks["platform_active"] = False
        
    # 2. Geolocation match
    # Did the trigger happen in their claimed zone?
    trigger_zone = event_data.get("zone", "")
    rider_zone = rider_profile.get("pin_code", "")
    if trigger_zone and rider_zone and trigger_zone != rider_zone:
        score += 0.4
        checks["gps_zone_match"] = False
        
    # 3. Isolation Forest Anomaly
    # Evaluate multivariate behavioral patterns algorithmically
    is_anomaly = _check_isolation_forest_anomaly(d30_orders, avg_daily_hrs)
    if is_anomaly:
        score += 0.25
        checks["anomaly_free"] = False
        
    # 4. Collusion network check
    # Heuristic: Are there too many claims from this exact IP/device today?
    # (Simulated)
    if claim_type == "outage" and random.random() > 0.9: # Outages often have fake mass claims
        score += 0.3
        checks["no_collusion"] = False
        
    return min(max(score, 0.0), 1.0), checks
