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

from ..config import CFG

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
    
    # 1. Hard Rule: Platform Active
    # (In a real system we'd ping Swiggy/Zomato here. We'll use the mock data.)
    activity = rider_profile.get("activity_summary", {})
    if activity.get("d30_orders", 0) < 5:
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
    # Simulate an IF model checking for unusual claiming frequency or time.
    # We use a deterministic but pseudo-random check based on rider ID length
    anomaly_factor = (len(rider_profile.get("rider_id", "123")) * 13) % 100
    if anomaly_factor > 80:
        score += 0.25
        checks["anomaly_free"] = False
        
    # 4. Collusion network check
    # Heuristic: Are there too many claims from this exact IP/device today?
    # (Simulated)
    if claim_type == "outage" and random.random() > 0.9: # Outages often have fake mass claims
        score += 0.3
        checks["no_collusion"] = False
        
    return min(max(score, 0.0), 1.0), checks
