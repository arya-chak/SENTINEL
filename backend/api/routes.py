# routes.py
# FastAPI route definitions for SENTINEL
# Exposes simulation state and operator actions as HTTP endpoints.
# The React frontend communicates exclusively through these routes.

from fastapi.responses import StreamingResponse
from backend.api.explainer import explain_entity, stream_explain_entity
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.simulation.loop import state
from backend.simulation.engine import (
    EntityType, EntityStatus, FriendlyCommand
)

router = APIRouter()


# ── Response Models ───────────────────────────────────────────────────────────
# Pydantic models define the exact shape of data sent to the frontend.
# Keeping these explicit means the frontend always knows what to expect.

class SensorEventOut(BaseModel):
    signal_type: str
    value: float
    timestamp: float


class EntityOut(BaseModel):
    id: str
    entity_type: str
    lat: float
    lon: float
    speed: float
    heading: float
    distance_to_hostile_zone: float
    pattern_of_life_deviation: float
    status: str
    unit_name: Optional[str]
    command: Optional[str]
    assigned_target_id: Optional[str]
    sensor_events: list[SensorEventOut]
    intel_report: str
    time_alive: float
    decision: Optional[str]


class DecisionIn(BaseModel):
    """Payload for operator approve/deny/more_intel decisions."""
    decision: str           # "approve" | "deny" | "more_intel"
    classifier_score: float # Score at time of decision — logged for debrief


class FriendlyCommandIn(BaseModel):
    """Payload for operator tactical commands on friendly units."""
    command: str                        # "hold" | "fall_back" | "advance_clear" | "request_status"
    assigned_target_id: Optional[str] = None  # Required for advance_clear


# ── Helper ────────────────────────────────────────────────────────────────────

def _entity_to_out(entity) -> EntityOut:
    """Convert an internal Entity dataclass to the API response model."""
    return EntityOut(
        id=entity.id,
        entity_type=entity.entity_type.value,
        lat=entity.lat,
        lon=entity.lon,
        speed=entity.speed,
        heading=entity.heading,
        distance_to_hostile_zone=entity.distance_to_hostile_zone,
        pattern_of_life_deviation=entity.pattern_of_life_deviation,
        status=entity.status.value,
        unit_name=entity.unit_name,
        command=entity.command.value if entity.command else None,
        assigned_target_id=entity.assigned_target_id,
        sensor_events=[
            SensorEventOut(
                signal_type=se.signal_type,
                value=se.value,
                timestamp=se.timestamp
            )
            for se in entity.sensor_events
        ],
        intel_report=entity.intel_report,
        time_alive=entity.time_alive,
        decision=entity.decision,
    )


# ── Simulation State Routes ───────────────────────────────────────────────────

@router.get("/entities", response_model=list[EntityOut])
def get_entities():
    """
    Returns all currently tracked entities in the battlespace.
    The frontend polls this endpoint on a fixed interval to update the map
    and target queue.
    """
    return [_entity_to_out(e) for e in state.get_all_entities()]


@router.get("/entities/{entity_id}", response_model=EntityOut)
def get_entity(entity_id: str):
    """
    Returns a single entity by ID.
    Called when the operator opens a target dossier.
    """
    entity = state.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return _entity_to_out(entity)


@router.get("/state")
def get_simulation_state():
    """
    Returns top-level simulation metadata.
    Used by the frontend header to display sim time and entity counts.
    """
    entities = state.get_all_entities()
    return {
        "sim_time":        state.sim_time,
        "running":         state.running,
        "entity_count":    len(entities),
        "hostile_count":   sum(1 for e in entities if e.entity_type == EntityType.HOSTILE),
        "friendly_count":  sum(1 for e in entities if e.entity_type == EntityType.FRIENDLY),
        "civilian_count":  sum(1 for e in entities if e.entity_type == EntityType.CIVILIAN),
        "ambiguous_count": sum(1 for e in entities if e.entity_type == EntityType.AMBIGUOUS),
        "decisions_made":  len(state.decision_log),
    }


# ── Operator Decision Routes ──────────────────────────────────────────────────

@router.post("/entities/{entity_id}/decide")
def decide_on_entity(entity_id: str, payload: DecisionIn):
    """
    Records an operator approve/deny/more_intel decision on a non-friendly entity.
    Updates entity status and logs the decision for debrief analysis.
    """
    entity = state.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    if entity.entity_type == EntityType.FRIENDLY:
        raise HTTPException(
            status_code=400,
            detail="Use /command endpoint for friendly units"
        )

    valid_decisions = {"approve", "deny", "more_intel"}
    if payload.decision not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision. Must be one of: {valid_decisions}"
        )

    # Apply decision outcomes
    entity.decision = payload.decision

    if payload.decision == "approve":
        entity.status = EntityStatus.NEUTRALIZED

    # Log whether the operator agreed with the AI
    # Classifier scores > 0.5 are considered an "approve" recommendation
    ai_recommended_approve = payload.classifier_score > 0.5
    operator_approved      = payload.decision == "approve"
    followed_ai            = ai_recommended_approve == operator_approved

    state.log_decision(
        entity_id=entity_id,
        decision=payload.decision,
        classifier_score=payload.classifier_score,
        followed_ai=followed_ai,
    )

    return {"status": "ok", "decision": payload.decision, "entity_id": entity_id}


@router.post("/entities/{entity_id}/command")
def command_friendly(entity_id: str, payload: FriendlyCommandIn):
    """
    Issues a tactical command to a friendly unit.
    Updates command state and — for advance_clear — sets the target position.
    """
    entity = state.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    if entity.entity_type != EntityType.FRIENDLY:
        raise HTTPException(
            status_code=400,
            detail="Use /decide endpoint for non-friendly entities"
        )

    if entity.status == EntityStatus.INCAPACITATED:
        raise HTTPException(
            status_code=400,
            detail="Unit is incapacitated and cannot receive commands"
        )

    # Map string command to enum
    command_map = {
        "hold":           FriendlyCommand.HOLD,
        "fall_back":      FriendlyCommand.FALL_BACK,
        "advance_clear":  FriendlyCommand.ADVANCE_CLEAR,
        "request_status": FriendlyCommand.REQUEST_STATUS,
    }

    if payload.command not in command_map:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid command. Must be one of: {list(command_map.keys())}"
        )

    entity.command = command_map[payload.command]

    # For advance_clear, wire up the target's current position
    if payload.command == "advance_clear":
        if not payload.assigned_target_id:
            raise HTTPException(
                status_code=400,
                detail="advance_clear requires an assigned_target_id"
            )
        target = state.get_entity(payload.assigned_target_id)
        if not target:
            raise HTTPException(
                status_code=404,
                detail="Assigned target not found"
            )
        entity.assigned_target_id = payload.assigned_target_id
        entity.target_lat = target.lat
        entity.target_lon = target.lon

    # Log the command as a decision for debrief tracking
    state.log_decision(
        entity_id=entity_id,
        decision=f"command:{payload.command}",
        classifier_score=0.0,
        followed_ai=False,    # Commands are purely operator-driven
    )

    return {
        "status":    "ok",
        "command":   payload.command,
        "entity_id": entity_id,
        "unit_name": entity.unit_name,
    }


# ── Debrief Route ─────────────────────────────────────────────────────────────

@router.get("/debrief")
def get_debrief():
    """
    Returns post-scenario analysis data.
    Called when the operator ends the scenario or time expires.
    """
    log = state.decision_log
    if not log:
        return {"message": "No decisions recorded yet"}

    total           = len(log)
    followed_ai     = sum(1 for d in log if d["followed_ai"])
    approve_count   = sum(1 for d in log if d["decision"] == "approve")
    deny_count      = sum(1 for d in log if d["decision"] == "deny")
    more_intel      = sum(1 for d in log if d["decision"] == "more_intel")
    casualties      = sum(
        1 for e in state.get_all_entities()
        if e.status == EntityStatus.INCAPACITATED
    )

    return {
        "total_decisions":    total,
        "approve_count":      approve_count,
        "deny_count":         deny_count,
        "more_intel_count":   more_intel,
        "followed_ai_count":  followed_ai,
        "followed_ai_rate":   round(followed_ai / total, 2) if total else 0,
        "friendly_casualties": casualties,
        "decision_log":       log,
    }

# ── Classifier Scoring Route ──────────────────────────────────────────────────

from backend.classifier.model import classifier

@router.get("/entities/{entity_id}/score")
def score_entity(entity_id: str):
    """
    Runs the threat classifier on a single entity and returns
    threat_score, confidence, label, and feature importances.
    Called when the operator opens a target dossier.
    """
    entity = state.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    return classifier.score(entity)

# ── LLM Explainer Route ───────────────────────────────────────────────────────

from backend.api.explainer import explain_entity

@router.get("/entities/{entity_id}/explain")
def explain(entity_id: str):
    """
    Sends the entity's intel report and classifier scores to Claude,
    which reasons through the evidence and returns a structured explanation.
    Called when the operator clicks the Explain button in the dossier panel.
    Surfaces LLM/classifier disagreements explicitly.
    """
    entity = state.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    return explain_entity(entity)

# ── Streaming LLM Explainer Route ─────────────────────────────────────────────

@router.get("/entities/{entity_id}/explain/stream")
async def explain_stream(entity_id: str):
    """
    Streams the LLM explanation as Server-Sent Events.
    Phase 1: prose reasoning tokens arrive continuously.
    Phase 2: a single [STRUCTURED] event delivers the full JSON result.
    Phase 3: [DONE] signals the stream is complete.
    """
    entity = state.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    return StreamingResponse(
        stream_explain_entity(entity),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disables nginx buffering if behind a proxy
        },
    )