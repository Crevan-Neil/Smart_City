# ─────────────────────────────────────────────
#  simulation/generator/city_config.py
#  Campus entity definitions + sensor parameters
#
#  This is the simulation's "world model" — it
#  defines every entity and how its sensors behave.
#  Must mirror the MongoDB seed data in backend/seed.js
# ─────────────────────────────────────────────

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class SensorParam:
    """Parameters for a single sensor metric on one entity."""
    metric: str
    unit: str
    base: float           # value at midnight (t=0)
    amplitude: float      # peak-to-trough swing over 24h
    peak_hour: float      # hour of day (0–23) when value is highest
    noise: float          # ±random noise added each tick
    min_val: float        # hard floor
    max_val: float        # hard ceiling
    alert_threshold: float


@dataclass
class EntityConfig:
    """One simulated campus entity (building or junction)."""
    entity_id: str
    name: str
    entity_type: str      # "building" | "junction"
    sensors: List[SensorParam] = field(default_factory=list)


# ─────────────────────────────────────────────
#  Campus entity + sensor definitions
# ─────────────────────────────────────────────

CAMPUS_ENTITIES: List[EntityConfig] = [

    # ── Engineering Block A ───────────────────
    EntityConfig(
        entity_id="bldA",
        name="Engineering Block A",
        entity_type="building",
        sensors=[
            SensorParam(
                metric="energy", unit="kW",
                base=120,   amplitude=180, peak_hour=13,
                noise=8,    min_val=30,   max_val=480,
                alert_threshold=420,
            ),
            SensorParam(
                metric="temperature", unit="°C",
                base=20,    amplitude=7,   peak_hour=14,
                noise=0.5,  min_val=16,   max_val=38,
                alert_threshold=35,
            ),
            SensorParam(
                metric="air_quality", unit="AQI",
                base=35,    amplitude=55,  peak_hour=9,
                noise=4,    min_val=10,   max_val=200,
                alert_threshold=150,
            ),
        ],
    ),

    # ── Main Admin Block ──────────────────────
    EntityConfig(
        entity_id="bldB",
        name="Main Admin Block",
        entity_type="building",
        sensors=[
            SensorParam(
                metric="energy", unit="kW",
                base=80,    amplitude=120, peak_hour=11,
                noise=6,    min_val=20,   max_val=340,
                alert_threshold=320,
            ),
            SensorParam(
                metric="temperature", unit="°C",
                base=21,    amplitude=6,   peak_hour=13,
                noise=0.4,  min_val=17,   max_val=36,
                alert_threshold=35,
            ),
        ],
    ),

    # ── Library & Research Centre ─────────────
    EntityConfig(
        entity_id="bldC",
        name="Library & Research Centre",
        entity_type="building",
        sensors=[
            SensorParam(
                metric="energy", unit="kW",
                base=150,   amplitude=240, peak_hour=14,
                noise=10,   min_val=40,   max_val=650,
                alert_threshold=420,
            ),
            SensorParam(
                metric="temperature", unit="°C",
                base=20,    amplitude=5,   peak_hour=15,
                noise=0.3,  min_val=16,   max_val=34,
                alert_threshold=35,
            ),
            SensorParam(
                metric="air_quality", unit="AQI",
                base=25,    amplitude=40,  peak_hour=10,
                noise=3,    min_val=8,    max_val=180,
                alert_threshold=150,
            ),
        ],
    ),

    # ── Student Hostel Block ──────────────────
    EntityConfig(
        entity_id="bldD",
        name="Student Hostel Block",
        entity_type="building",
        sensors=[
            SensorParam(
                # Hostels peak late evening, not midday
                metric="energy", unit="kW",
                base=200,   amplitude=160, peak_hour=21,
                noise=12,   min_val=60,   max_val=850,
                alert_threshold=420,
            ),
            SensorParam(
                metric="temperature", unit="°C",
                base=22,    amplitude=4,   peak_hour=20,
                noise=0.6,  min_val=18,   max_val=34,
                alert_threshold=35,
            ),
        ],
    ),

    # ── Utility & Power Station ───────────────
    EntityConfig(
        entity_id="bldE",
        name="Utility & Power Station",
        entity_type="building",
        sensors=[
            SensorParam(
                # Flat baseline — utility rooms don't spike
                metric="energy", unit="kW",
                base=40,    amplitude=30,  peak_hour=12,
                noise=3,    min_val=10,   max_val=120,
                alert_threshold=100,
            ),
        ],
    ),

    # ── Main Gate Junction ────────────────────
    EntityConfig(
        entity_id="jxn1",
        name="Main Gate Junction",
        entity_type="junction",
        sensors=[
            SensorParam(
                # Two rush-hour peaks: morning (8am) and evening (5pm)
                # Modelled as sum of two sine waves in random_walk.py
                metric="traffic", unit="vehicles",
                base=10,    amplitude=55,  peak_hour=8,
                noise=5,    min_val=0,    max_val=100,
                alert_threshold=90,
            ),
        ],
    ),
]

# ── Quick lookup by entity ID ──────────────────
ENTITY_MAP: Dict[str, EntityConfig] = {
    e.entity_id: e for e in CAMPUS_ENTITIES
}