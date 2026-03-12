# engine.py
# Core simulation engine for SENTINEL
# Responsible for generating synthetic battlefield entities,
# their sensor data, and intelligence reports

import random
import math
import uuid
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

# ── Entity Classification ─────────────────────────────────────────────────────
# The ground truth label for each entity — only the simulation knows this.
# The operator and AI must infer it from sensor data alone.

class EntityType(Enum):
    CIVILIAN   = "civilian"
    HOSTILE    = "hostile"
    FRIENDLY   = "friendly"
    AMBIGUOUS  = "ambiguous"  # Deliberately unclear — the interesting cases


# ── Friendly Command States ───────────────────────────────────────────────────
# Commands the operator can issue to friendly units.
# The simulation engine reads this each tick to update friendly movement.

class FriendlyCommand(Enum):
    HOLD          = "hold"           # Stay in current position
    FALL_BACK     = "fall_back"      # Move away from nearest threat
    ADVANCE_CLEAR = "advance_clear"  # Move toward assigned hostile target
    REQUEST_STATUS = "request_status" # Ping unit for status report


# ── Entity Status ─────────────────────────────────────────────────────────────
# Tracks the current operational status of any entity on the battlefield.
# Friendlies can be incapacitated; hostiles can be neutralized.

class EntityStatus(Enum):
    ACTIVE       = "active"        # Moving and operational
    HOLDING      = "holding"       # Stationary by command or choice
    FALLING_BACK = "falling_back"  # Executing fall back order
    ADVANCING    = "advancing"     # Executing advance and clear order
    NEUTRALIZED  = "neutralized"   # Hostile has been approved and engaged
    INCAPACITATED = "incapacitated" # Friendly took damage — too close to threat


# ── Sensor Event ──────────────────────────────────────────────────────────────
# A single sensor reading attached to an entity at a point in time.
# These are the raw signals the classifier will use to score the entity.

@dataclass
class SensorEvent:
    signal_type: str        # e.g. "encrypted_comms", "thermal", "movement"
    value: float            # Normalized 0.0 → 1.0 intensity/severity
    timestamp: float        # Simulation clock time when detected


# ── Entity ────────────────────────────────────────────────────────────────────
# The core object representing any tracked unit on the battlefield —
# hostile, friendly, civilian, or ambiguous.
# Movement, sensor history, commands, and status all live here.

@dataclass
class Entity:
    id: str                          # Unique identifier (UUID)
    entity_type: EntityType          # Ground truth label
    lat: float                       # Current latitude
    lon: float                       # Current longitude
    speed: float                     # Current speed in km/h
    heading: float                   # Direction of travel in degrees (0-360)
    distance_to_hostile_zone: float  # km to nearest known hostile area
    pattern_of_life_deviation: float # 0.0 = normal behaviour, 1.0 = highly abnormal
    status: EntityStatus = EntityStatus.ACTIVE

    # ── Friendly-specific fields ───────────────────────────────────────────────
    command: Optional[FriendlyCommand] = None     # Current operator command
    assigned_target_id: Optional[str] = None      # Target ID for advance/clear
    unit_name: Optional[str] = None               # e.g. "Alpha-1", "Bravo-3"

    # ── Movement fields ────────────────────────────────────────────────────────
    target_lat: Optional[float] = None            # Destination latitude
    target_lon: Optional[float] = None            # Destination longitude

    # ── Intelligence and sensor fields ────────────────────────────────────────
    sensor_events: list[SensorEvent] = field(default_factory=list)
    intel_report: str = ""
    time_alive: float = 0.0

    # ── Operator decision fields ───────────────────────────────────────────────
    decision: Optional[str] = None

# ── Unit Names ────────────────────────────────────────────────────────────────
# Callsigns assigned to friendly units for operator identification.
# Rotated through as friendlies are spawned.

FRIENDLY_UNIT_NAMES = [
    "Alpha-1", "Alpha-2", "Bravo-1", "Bravo-2",
    "Bravo-3", "Charlie-1", "Charlie-2", "Delta-1"
]

# ── Sensor Signal Types ───────────────────────────────────────────────────────
# The pool of sensor signals the simulation can attach to entities.
# Hostile entities skew toward high-threat signals; civilians skew toward benign ones.

HOSTILE_SIGNALS  = ["encrypted_comms", "thermal_spike", "weapons_profile", "erratic_movement"]
FRIENDLY_SIGNALS = ["blufor_transponder", "standard_comms", "uniform_pattern"]
CIVILIAN_SIGNALS = ["mobile_signal", "foot_traffic", "market_activity", "vehicle_idle"]
AMBIGUOUS_SIGNALS = ["unencrypted_comms", "unusual_movement", "unknown_vehicle", "nighttime_activity"]


# ── Simulation Bounds ─────────────────────────────────────────────────────────
# A fictional operational area centered roughly in the Middle East.
# Lat/lon bounds keep all entities within a reasonable map viewport.

LAT_MIN, LAT_MAX = 33.0, 34.5
LON_MIN, LON_MAX = 43.0, 44.5


# ── Entity Spawner ────────────────────────────────────────────────────────────
# Creates a new entity with a statistical fingerprint appropriate to its type.
# Hostile entities carry high threat signals; civilians carry benign ones;
# ambiguous entities are deliberately noisy — mixed signals, uncertain intent.
# Friendly units carry command state and a callsign.

_friendly_name_index = 0  # Tracks which callsign to assign next

def spawn_entity(entity_type: EntityType, sim_time: float) -> Entity:
    global _friendly_name_index

    entity_id = str(uuid.uuid4())

    # ── Randomised position within operational bounds ──────────────────────────
    lat = random.uniform(LAT_MIN, LAT_MAX)
    lon = random.uniform(LON_MIN, LON_MAX)

    # ── Type-specific statistical fingerprints ────────────────────────────────
    # Each type gets a realistic distribution of speed, heading,
    # proximity to danger, and pattern-of-life deviation.
    # Noise is deliberately added so the classifier has to work for it.

    if entity_type == EntityType.HOSTILE:
        speed     = random.uniform(30, 90) + random.gauss(0, 8)
        heading   = random.uniform(0, 360)
        dist_hz   = random.uniform(0.2, 4.0) + random.gauss(0, 0.5)
        pol_dev   = random.uniform(0.5, 1.0) + random.gauss(0, 0.08)
        signals   = random.sample(HOSTILE_SIGNALS, k=random.randint(2, min(4, len(HOSTILE_SIGNALS))))
        # Occasionally add a misleading civilian signal to create false negatives
        if random.random() < 0.2:
            signals.append(random.choice(CIVILIAN_SIGNALS))

    elif entity_type == EntityType.CIVILIAN:
        speed     = random.uniform(2, 28) + random.gauss(0, 3)
        heading   = random.uniform(0, 360)
        dist_hz   = random.uniform(2.0, 15.0) + random.gauss(0, 1.0)
        pol_dev   = random.uniform(0.0, 0.35) + random.gauss(0, 0.05)
        signals   = random.sample(CIVILIAN_SIGNALS, k=random.randint(1, min(3, len(CIVILIAN_SIGNALS))))
        # Occasionally a civilian is near a hostile zone or moves unusually
        if random.random() < 0.15:
            dist_hz = random.uniform(0.5, 2.5)
        if random.random() < 0.1:
            signals.append(random.choice(AMBIGUOUS_SIGNALS))

    elif entity_type == EntityType.FRIENDLY:
        speed     = random.uniform(10, 40) + random.gauss(0, 4)
        heading   = random.uniform(0, 360)
        dist_hz   = random.uniform(1.0, 8.0) + random.gauss(0, 0.8)
        pol_dev   = random.uniform(0.0, 0.2) + random.gauss(0, 0.03)
        signals   = random.sample(FRIENDLY_SIGNALS, k=random.randint(1, min(2, len(FRIENDLY_SIGNALS))))

    else:  # AMBIGUOUS
        # Ambiguous entities borrow heavily from both hostile and civilian
        # distributions — the classifier should genuinely struggle here
        speed     = random.uniform(10, 70) + random.gauss(0, 10)
        heading   = random.uniform(0, 360)
        dist_hz   = random.uniform(0.8, 7.0) + random.gauss(0, 1.2)
        pol_dev   = random.uniform(0.2, 0.8) + random.gauss(0, 0.1)
        signals   = (
            random.choices(AMBIGUOUS_SIGNALS, k=random.randint(1, 2)) +
            random.choices(HOSTILE_SIGNALS + CIVILIAN_SIGNALS, k=random.randint(1, 2))
        )

    # Clamp values to valid ranges after gaussian noise
    speed   = max(1.0,  min(120.0, speed))
    dist_hz = max(0.1,  min(20.0,  dist_hz))
    pol_dev = max(0.0,  min(1.0,   pol_dev))

    # ── Build sensor events from selected signals ──────────────────────────────
    sensor_events = [
        SensorEvent(
            signal_type=sig,
            value=round(random.uniform(0.3, 1.0), 2),
            timestamp=sim_time
        )
        for sig in signals
    ]

    # ── Friendly-specific fields ───────────────────────────────────────────────
    unit_name = None
    command   = None

    if entity_type == EntityType.FRIENDLY:
        unit_name = FRIENDLY_UNIT_NAMES[_friendly_name_index % len(FRIENDLY_UNIT_NAMES)]
        _friendly_name_index += 1
        command = FriendlyCommand.HOLD  # Friendlies start stationary awaiting orders

    # ── Assemble and return the entity ────────────────────────────────────────
    return Entity(
        id=entity_id,
        entity_type=entity_type,
        lat=lat,
        lon=lon,
        speed=speed,
        heading=heading,
        distance_to_hostile_zone=round(dist_hz, 2),
        pattern_of_life_deviation=round(pol_dev, 2),
        sensor_events=sensor_events,
        intel_report="",          # Generated in next chunk
        time_alive=0.0,
        status=EntityStatus.ACTIVE,
        unit_name=unit_name,
        command=command,
    )

# ── Intel Report Generator ────────────────────────────────────────────────────
# Produces a natural language intelligence report for each entity.
# This is what gets sent to the Claude API when the operator clicks Explain.
# Reports are written to sound like real field intelligence — terse, factual,
# and deliberately incomplete. The LLM must reason under uncertainty.

def generate_intel_report(entity: Entity) -> str:

    # ── Build a readable signal list ──────────────────────────────────────────
    signal_descriptions = {
        # Hostile signals
        "encrypted_comms":   "encrypted radio communications detected",
        "thermal_spike":     "thermal signature inconsistent with civilian profile",
        "weapons_profile":   "sensor profile consistent with weapons carry",
        "erratic_movement":  "movement pattern shows irregular stop-start behaviour",

        # Friendly signals
        "blufor_transponder": "BLUFOR IFF transponder active and verified",
        "standard_comms":    "communications on known friendly frequency",
        "uniform_pattern":   "movement consistent with trained military unit",

        # Civilian signals
        "mobile_signal":     "civilian mobile device signal detected",
        "foot_traffic":      "on-foot movement consistent with local population",
        "market_activity":   "activity consistent with local market or commerce",
        "vehicle_idle":      "vehicle stationary for extended period",

        # Ambiguous signals
        "unencrypted_comms":    "unencrypted radio transmission detected — origin unclear",
        "unusual_movement":     "movement deviates from established pattern-of-life",
        "unknown_vehicle":      "unregistered vehicle — no match in local database",
        "nighttime_activity":   "activity observed outside normal civilian hours",
    }

    # Convert sensor events to readable lines
    signal_lines = []
    for event in entity.sensor_events:
        description = signal_descriptions.get(
            event.signal_type,
            f"{event.signal_type.replace('_', ' ')} detected"
        )
        intensity = (
            "strong"    if event.value > 0.75 else
            "moderate"  if event.value > 0.45 else
            "weak"
        )
        signal_lines.append(f"  - {description.capitalize()} ({intensity} signal, value {event.value})")

    signals_block = "\n".join(signal_lines) if signal_lines else "  - No sensor data available"

    # ── Behaviour summary ─────────────────────────────────────────────────────
    # Translates numerical features into plain language assessments.

    speed_desc = (
        "stationary or near-stationary" if entity.speed < 5 else
        "moving at walking pace"        if entity.speed < 15 else
        "moving at vehicle speed"       if entity.speed < 50 else
        "moving at high speed"
    )

    proximity_desc = (
        "within immediate proximity of a known hostile zone"  if entity.distance_to_hostile_zone < 1.0 else
        "in close proximity to a known hostile zone"          if entity.distance_to_hostile_zone < 3.0 else
        "at moderate distance from known hostile zones"       if entity.distance_to_hostile_zone < 7.0 else
        "well outside known hostile zones"
    )

    pol_desc = (
        "pattern-of-life appears normal for this area"           if entity.pattern_of_life_deviation < 0.25 else
        "minor deviations from established pattern-of-life"      if entity.pattern_of_life_deviation < 0.5  else
        "significant deviations from established pattern-of-life" if entity.pattern_of_life_deviation < 0.75 else
        "behaviour strongly deviates from all known pattern-of-life baselines"
    )

    # ── Entity type preamble ──────────────────────────────────────────────────
    # Friendlies get a different report style — their identity is confirmed,
    # but their tactical situation is reported the same way as other entities.

    if entity.entity_type == EntityType.FRIENDLY:
        preamble = (
            f"UNIT REPORT — {entity.unit_name}\n"
            f"Status: BLUFOR confirmed. IFF verification successful.\n"
            f"Current command state: {entity.command.value.replace('_', ' ').upper() if entity.command else 'NONE'}.\n"
        )
    else:
        preamble = (
            f"INTELLIGENCE REPORT — ENTITY {entity.id[:8].upper()}\n"
            f"Classification: UNCONFIRMED. Operator assessment required.\n"
        )

    # ── Assemble full report ──────────────────────────────────────────────────
    report = (
        f"{preamble}"
        f"\nSENSOR SUMMARY:\n"
        f"{signals_block}\n"
        f"\nBEHAVIOURAL ASSESSMENT:\n"
        f"  - Target is {speed_desc} ({round(entity.speed, 1)} km/h).\n"
        f"  - Target is {proximity_desc} ({entity.distance_to_hostile_zone} km).\n"
        f"  - {pol_desc.capitalize()} (deviation index: {entity.pattern_of_life_deviation}).\n"
        f"\nNOTE: This report is generated from available sensor data only. "
        f"Ground truth has not been confirmed. Analyst and operator judgement required."
    )

    return report


# ── Attach Intel Report to Entity ─────────────────────────────────────────────
# Called immediately after spawning to populate the entity's intel_report field.

def attach_intel_report(entity: Entity) -> Entity:
    entity.intel_report = generate_intel_report(entity)
    return entity

# ── Movement System ───────────────────────────────────────────────────────────
# Updates entity positions each simulation tick based on their type and state.
# Hostile and civilian entities follow simple heading-based movement.
# Friendly entities respond to operator commands — steering toward targets
# or away from threats depending on their current command state.

# Approximate conversion factors for our operational area
# At ~33-34°N latitude, these are close enough for simulation purposes
KM_PER_LAT_DEGREE = 111.0
KM_PER_LON_DEGREE = 93.0

def _move_by_heading(lat: float, lon: float, heading_deg: float,
                     speed_kmh: float, delta_seconds: float) -> tuple[float, float]:
    """
    Move a lat/lon point in a given heading direction.
    Heading 0° = north, 90° = east, 180° = south, 270° = west.
    Returns updated (lat, lon).
    """
    distance_km = (speed_kmh * delta_seconds) / 3600.0
    heading_rad = math.radians(heading_deg)

    delta_lat = (distance_km * math.cos(heading_rad)) / KM_PER_LAT_DEGREE
    delta_lon = (distance_km * math.sin(heading_rad)) / KM_PER_LON_DEGREE

    return lat + delta_lat, lon + delta_lon


def _heading_toward(from_lat: float, from_lon: float,
                    to_lat: float, to_lon: float) -> float:
    """
    Calculate the heading in degrees from one point to another.
    Used to steer friendly units toward assigned targets.
    """
    delta_lat = (to_lat - from_lat) * KM_PER_LAT_DEGREE
    delta_lon = (to_lon - from_lon) * KM_PER_LON_DEGREE
    heading_rad = math.atan2(delta_lon, delta_lat)
    return math.degrees(heading_rad) % 360


def _clamp_to_bounds(lat: float, lon: float) -> tuple[float, float]:
    """
    Keep entities within the operational area bounds.
    If an entity reaches the edge it bounces back inward.
    """
    lat = max(LAT_MIN, min(LAT_MAX, lat))
    lon = max(LON_MIN, min(LON_MAX, lon))
    return lat, lon


def update_entity_movement(entity: Entity, delta_seconds: float,
                            all_entities: list) -> Entity:
    """
    Update a single entity's position for one simulation tick.

    - Hostiles and civilians move on their current heading, occasionally
      drifting to simulate realistic non-linear movement.
    - Friendlies respond to their command state:
        HOLD          → do not move
        FALL_BACK     → move away from nearest threat
        ADVANCE_CLEAR → steer toward assigned target
        REQUEST_STATUS → do not move, status reported via intel report
    """

    # ── Skip movement for terminal states ─────────────────────────────────────
    if entity.status in (EntityStatus.NEUTRALIZED, EntityStatus.INCAPACITATED):
        return entity

    # ── Hostile movement ───────────────────────────────────────────────────────
    # Hostiles move purposefully on their heading with occasional direction changes
    # to simulate patrol routes or assault approaches.
    if entity.entity_type == EntityType.HOSTILE:
        if random.random() < 0.1:              # 10% chance of heading change per tick
            entity.heading = (entity.heading + random.uniform(-30, 30)) % 360
        new_lat, new_lon = _move_by_heading(
            entity.lat, entity.lon, entity.heading, entity.speed, delta_seconds
        )
        entity.lat, entity.lon = _clamp_to_bounds(new_lat, new_lon)
        entity.status = EntityStatus.ACTIVE

    # ── Civilian movement ──────────────────────────────────────────────────────
    # Civilians move slowly and change direction more frequently —
    # simulating pedestrian or local vehicle traffic patterns.
    elif entity.entity_type == EntityType.CIVILIAN:
        if random.random() < 0.2:              # 20% chance of direction drift
            entity.heading = (entity.heading + random.uniform(-60, 60)) % 360
        new_lat, new_lon = _move_by_heading(
            entity.lat, entity.lon, entity.heading, entity.speed, delta_seconds
        )
        entity.lat, entity.lon = _clamp_to_bounds(new_lat, new_lon)
        entity.status = EntityStatus.ACTIVE

    # ── Ambiguous movement ─────────────────────────────────────────────────────
    # Ambiguous entities behave erratically — unpredictable heading changes,
    # occasional stops. This feeds into their pattern-of-life deviation score.
    elif entity.entity_type == EntityType.AMBIGUOUS:
        if random.random() < 0.3:              # 30% chance of erratic direction change
            entity.heading = (entity.heading + random.uniform(-90, 90)) % 360
        if random.random() < 0.15:             # 15% chance of brief stop
            entity.status = EntityStatus.HOLDING
        else:
            new_lat, new_lon = _move_by_heading(
                entity.lat, entity.lon, entity.heading, entity.speed, delta_seconds
            )
            entity.lat, entity.lon = _clamp_to_bounds(new_lat, new_lon)
            entity.status = EntityStatus.ACTIVE

    # ── Friendly movement ──────────────────────────────────────────────────────
    # Friendlies are fully command-driven. Their movement is determined
    # entirely by the operator's last issued command.
    elif entity.entity_type == EntityType.FRIENDLY:

        if entity.command == FriendlyCommand.HOLD:
            entity.status = EntityStatus.HOLDING

        elif entity.command == FriendlyCommand.REQUEST_STATUS:
            # Unit stays in place — status is surfaced via intel report
            entity.status = EntityStatus.HOLDING

        elif entity.command == FriendlyCommand.ADVANCE_CLEAR:
            # Steer toward the assigned target's position
            if entity.target_lat is not None and entity.target_lon is not None:
                entity.heading = _heading_toward(
                    entity.lat, entity.lon,
                    entity.target_lat, entity.target_lon
                )
                new_lat, new_lon = _move_by_heading(
                    entity.lat, entity.lon, entity.heading, entity.speed, delta_seconds
                )
                entity.lat, entity.lon = _clamp_to_bounds(new_lat, new_lon)
                entity.status = EntityStatus.ADVANCING

        elif entity.command == FriendlyCommand.FALL_BACK:
            # Find the nearest threat and move directly away from it
            threats = [
                e for e in all_entities
                if e.entity_type in (EntityType.HOSTILE, EntityType.AMBIGUOUS)
                and e.status != EntityStatus.NEUTRALIZED
            ]
            if threats:
                # Find the closest threat
                def dist(e):
                    return math.sqrt(
                        ((e.lat - entity.lat) * KM_PER_LAT_DEGREE) ** 2 +
                        ((e.lon - entity.lon) * KM_PER_LON_DEGREE) ** 2
                    )
                nearest = min(threats, key=dist)

                # Head directly away — add 180° to the heading toward the threat
                toward_threat = _heading_toward(
                    entity.lat, entity.lon, nearest.lat, nearest.lon
                )
                entity.heading = (toward_threat + 180) % 360
                new_lat, new_lon = _move_by_heading(
                    entity.lat, entity.lon, entity.heading, entity.speed, delta_seconds
                )
                entity.lat, entity.lon = _clamp_to_bounds(new_lat, new_lon)
            entity.status = EntityStatus.FALLING_BACK

    # ── Update time alive ──────────────────────────────────────────────────────
    entity.time_alive += delta_seconds

    return entity


def update_all_entities(entities: list, delta_seconds: float) -> list:
    """
    Run one movement tick across the entire entity list.
    Passes the full entity list to each update so friendlies can
    locate threats when computing fall-back direction.
    """
    return [update_entity_movement(e, delta_seconds, entities) for e in entities]    

# ── Quick smoke test — remove before production ───────────────────────────────
if __name__ == "__main__":
    for etype in EntityType:
        entity = spawn_entity(etype, sim_time=0.0)
        entity = attach_intel_report(entity)
        print(f"\n{'='*60}")
        print(f"TYPE: {entity.entity_type.value.upper()}")
        print(f"Speed: {entity.speed:.1f} km/h | POL Dev: {entity.pattern_of_life_deviation}")
        print(f"Dist to hostile zone: {entity.distance_to_hostile_zone} km")
        print(f"\n{entity.intel_report}")