from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_rider_id, get_store
from ..schemas import ActivatePolicyRequest, CurrentPolicyResponse, Policy, TriggerStatus
from ..storage import InMemoryStore

router = APIRouter(prefix="/policies", tags=["policies"])


def _serialize_policy(policy) -> Policy:
    return Policy(
        policy_id=policy.policy_id,
        rider_id=policy.rider_id,
        status=policy.status,
        week_start=policy.week_start.isoformat(),
        week_end=policy.week_end.isoformat(),
    )


def _trigger_statuses(store: InMemoryStore) -> list[TriggerStatus]:
    now = datetime.utcnow().isoformat()
    event_lookup = {event.trigger_type: event for event in store.list_trigger_events()}

    def status_for(trigger_type: str) -> str:
        event = event_lookup.get(trigger_type)
        if not event:
            return "idle"
        if event.observed_at >= datetime.utcnow() - timedelta(hours=2):
            return "fired"
        return "watch"

    return [
        TriggerStatus(trigger_type="rain", threshold_label=">= 64.5mm", is_armed=True, last_checked_at=now, state=status_for("rain")),
        TriggerStatus(trigger_type="heat", threshold_label=">= 45C or HI 41C", is_armed=True, last_checked_at=now, state=status_for("heat")),
        TriggerStatus(trigger_type="outage", threshold_label=">= 30 min", is_armed=True, last_checked_at=now, state=status_for("outage")),
        TriggerStatus(trigger_type="aqi", threshold_label=">= 300", is_armed=True, last_checked_at=now, state=status_for("aqi")),
        TriggerStatus(trigger_type="closure", threshold_label="FSSAI zone closure", is_armed=True, last_checked_at=now, state=status_for("closure")),
        TriggerStatus(trigger_type="fog", threshold_label="visibility < 50m", is_armed=True, last_checked_at=now, state=status_for("fog")),
    ]


@router.post("/activate", response_model=Policy)
async def activate(
    payload: ActivatePolicyRequest,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> Policy:
    if payload.rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    try:
        policy = store.activate_policy(payload.rider_id, payload.upi_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="rider not found") from exc
    return _serialize_policy(policy)


@router.get("/{rider_id}/current", response_model=CurrentPolicyResponse)
async def current(
    rider_id: str,
    store: InMemoryStore = Depends(get_store),
    current_rider_id: str = Depends(get_current_rider_id),
) -> CurrentPolicyResponse:
    if rider_id != current_rider_id:
        raise HTTPException(status_code=403, detail="token subject does not match rider")
    if rider_id not in store.riders:
        raise HTTPException(status_code=404, detail="rider not found")
    policy = store.current_policy(rider_id)
    return CurrentPolicyResponse(
        policy=_serialize_policy(policy),
        week_progress=store.week_progress(policy),
        next_premium=policy.next_premium,
        trigger_statuses=_trigger_statuses(store),
    )
