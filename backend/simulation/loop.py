# loop.py
# The simulation clock — drives entity spawning and movement updates
# on a fixed tick interval. Maintains the live state of the battlespace
# and exposes it to the FastAPI layer for the frontend to consume.

import asyncio
import random
import time
from collections import defaultdict
from backend.simulation.engine import (
    Entity, EntityType, EntityStatus, FriendlyCommand,
    spawn_entity, attach_intel_report, update_all_entities
)

# ── Simulation Configuration ──────────────────────────────────────────────────
# These values control the pacing and composition of the battlespace.
# Tweak these to make scenarios easier, harder, or more chaotic.

TICK_INTERVAL       = 2.0    # Seconds between simulation updates
MAX_ENTITIES        = 20     # Maximum entities alive at once
SPAWN_INTERVAL      = 8.0    # Seconds between spawn attempts
MAX_FRIENDLIES      = 4      # Cap on friendly units to keep UI manageable

# Entity type spawn weights — controls how often each type appears.
# Ambiguous is weighted high to ensure the interesting decisions happen often.
SPAWN_WEIGHTS = {
    EntityType.HOSTILE:   0.30,
    EntityType.CIVILIAN:  0.30,
    EntityType.AMBIGUOUS: 0.30,
    EntityType.FRIENDLY:  0.10,   # Friendlies are rarer — controlled assets
}


# ── Simulation State ──────────────────────────────────────────────────────────
# All live state lives here. The FastAPI layer reads from this directly.
# No database — everything is in memory for this simulation.

class SimulationState:
    def __init__(self):
        self.entities: dict[str, Entity] = {}   # Keyed by entity ID
        self.sim_time: float = 0.0               # Simulation clock in seconds
        self.running: bool = False               # Whether the loop is active
        self.scenario_start: float = 0.0         # Wall clock time at scenario start
        self.decision_log: list[dict] = []       # Operator decisions for debrief

    def get_entity(self, entity_id: str) -> Entity | None:
        return self.entities.get(entity_id)

    def get_all_entities(self) -> list[Entity]:
        return list(self.entities.values())

    def get_active_entities(self) -> list[Entity]:
        """Return only entities that are still operationally relevant."""
        return [
            e for e in self.entities.values()
            if e.status not in (EntityStatus.NEUTRALIZED, EntityStatus.INCAPACITATED)
        ]

    def count_friendlies(self) -> int:
        return sum(
            1 for e in self.entities.values()
            if e.entity_type == EntityType.FRIENDLY
            and e.status not in (EntityStatus.INCAPACITATED,)
        )

    def log_decision(self, entity_id: str, decision: str,
                     classifier_score: float, followed_ai: bool):
        """Record an operator decision for post-scenario debrief analysis."""
        entity = self.get_entity(entity_id)
        if entity:
            self.decision_log.append({
                "entity_id":       entity_id,
                "entity_type":     entity.entity_type.value,
                "decision":        decision,
                "classifier_score": classifier_score,
                "followed_ai":     followed_ai,
                "sim_time":        self.sim_time,
                "unit_name":       entity.unit_name,
            })


# ── Global state instance ─────────────────────────────────────────────────────
# Single shared instance — imported by the FastAPI routes.

state = SimulationState()


# ── Spawner Logic ─────────────────────────────────────────────────────────────
# Decides whether to spawn a new entity this tick and what type it should be.
# Respects entity caps to prevent the battlespace becoming unmanageable.

def _maybe_spawn(sim_time: float):
    """Attempt to spawn a new entity if conditions allow."""

    # Don't spawn if we're at capacity
    if len(state.entities) >= MAX_ENTITIES:
        return

    # Weight the spawn type — but cap friendlies separately
    available_types = list(SPAWN_WEIGHTS.keys())
    weights         = list(SPAWN_WEIGHTS.values())

    # Remove friendly from pool if we're at the friendly cap
    if state.count_friendlies() >= MAX_FRIENDLIES:
        idx = available_types.index(EntityType.FRIENDLY)
        available_types.pop(idx)
        weights.pop(idx)

    entity_type = random.choices(available_types, weights=weights, k=1)[0]

    entity = spawn_entity(entity_type, sim_time)
    entity = attach_intel_report(entity)
    state.entities[entity.id] = entity


# ── Cleanup Logic ─────────────────────────────────────────────────────────────
# Removes entities that have been decided on and are no longer relevant,
# keeping the battlespace from accumulating stale entries.

def _cleanup_decided_entities():
    """
    Remove entities that have been actioned by the operator and have
    reached a terminal state. Keeps the entity dict lean.
    """
    to_remove = [
        eid for eid, e in state.entities.items()
        if e.status in (EntityStatus.NEUTRALIZED,)
        and e.decision is not None
        and e.time_alive > 30.0    # Give the UI time to show the outcome
    ]
    for eid in to_remove:
        del state.entities[eid]


# ── Incapacitation Check ──────────────────────────────────────────────────────
# Checks if any friendly units are dangerously close to active hostiles.
# If so, marks them as incapacitated — a consequence of bad operator decisions.

def _check_incapacitation():
    """
    If a friendly unit is within 0.5km of an active hostile and has not
    been given a fall-back order, it becomes incapacitated.
    This surfaces in the post-scenario debrief as a casualty.
    """
    import math
    KM_PER_LAT = 111.0
    KM_PER_LON = 93.0

    friendlies = [
        e for e in state.entities.values()
        if e.entity_type == EntityType.FRIENDLY
        and e.status not in (EntityStatus.INCAPACITATED,)
    ]
    hostiles = [
        e for e in state.entities.values()
        if e.entity_type == EntityType.HOSTILE
        and e.status == EntityStatus.ACTIVE
    ]

    for friendly in friendlies:
        for hostile in hostiles:
            dist_km = math.sqrt(
                ((friendly.lat - hostile.lat) * KM_PER_LAT) ** 2 +
                ((friendly.lon - hostile.lon) * KM_PER_LON) ** 2
            )
            if dist_km < 0.5 and friendly.command != FriendlyCommand.FALL_BACK:
                friendly.status = EntityStatus.INCAPACITATED
                # Regenerate intel report to reflect new status
                friendly.intel_report = (
                    f"UNIT REPORT — {friendly.unit_name}\n"
                    f"Status: INCAPACITATED. Unit is non-operational.\n"
                    f"Cause: Proximity to active hostile — operator intervention required.\n"
                )
                break


# ── Main Simulation Loop ──────────────────────────────────────────────────────
# Runs as an asyncio background task alongside the FastAPI server.
# Each tick: move entities → check incapacitation → maybe spawn → cleanup.

async def simulation_loop():
    """
    The main async loop that drives the battlespace.
    Runs continuously while state.running is True.
    Called once at FastAPI startup.
    """
    state.running = True
    state.scenario_start = time.time()

    last_spawn_time = 0.0

    # Seed the battlespace with an initial set of entities
    for _ in range(3):
        _maybe_spawn(state.sim_time)

    while state.running:
        tick_start = time.time()

        # ── 1. Move all entities ───────────────────────────────────────────────
        updated = update_all_entities(
            state.get_all_entities(), TICK_INTERVAL
        )
        for entity in updated:
            state.entities[entity.id] = entity

        # ── 2. Check for friendly incapacitation ───────────────────────────────
        _check_incapacitation()

        # ── 3. Maybe spawn a new entity ────────────────────────────────────────
        if state.sim_time - last_spawn_time >= SPAWN_INTERVAL:
            _maybe_spawn(state.sim_time)
            last_spawn_time = state.sim_time

        # ── 4. Clean up resolved entities ─────────────────────────────────────
        _cleanup_decided_entities()

        # ── 5. Advance simulation clock ────────────────────────────────────────
        state.sim_time += TICK_INTERVAL

        # ── 6. Sleep until next tick ───────────────────────────────────────────
        # Accounts for the time spent processing so ticks stay consistent
        elapsed  = time.time() - tick_start
        sleep_for = max(0.0, TICK_INTERVAL - elapsed)
        await asyncio.sleep(sleep_for)


def stop_simulation():
    """Gracefully stop the simulation loop."""
    state.running = False