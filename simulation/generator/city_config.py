# ─────────────────────────────────────────────
#  simulation/generator/city_config.py
#  Campus entity definitions + sensor parameters
# ─────────────────────────────────────────────

from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class SensorParam:
    metric: str
    unit: str
    base: float
    amplitude: float
    peak_hour: float
    noise: float
    min_val: float
    max_val: float
    alert_threshold: float

@dataclass
class EntityConfig:
    entity_id: str
    name: str
    entity_type: str
    sensors: List[SensorParam] = field(default_factory=list)

CAMPUS_ENTITIES: List[EntityConfig] = [
    # Buildings
    EntityConfig(entity_id="bldA", name="Engineering Block A", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=120, amplitude=180, peak_hour=13, noise=8, min_val=30, max_val=480, alert_threshold=420),
        SensorParam(metric="temperature", unit="°C", base=20, amplitude=7, peak_hour=14, noise=0.5, min_val=16, max_val=38, alert_threshold=35),
        SensorParam(metric="air_quality", unit="AQI", base=35, amplitude=55, peak_hour=9, noise=4, min_val=10, max_val=200, alert_threshold=150),
    ]),
    EntityConfig(entity_id="bldB", name="Main Admin Block", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=80, amplitude=120, peak_hour=11, noise=6, min_val=20, max_val=340, alert_threshold=320),
        SensorParam(metric="temperature", unit="°C", base=21, amplitude=6, peak_hour=13, noise=0.4, min_val=17, max_val=36, alert_threshold=35),
    ]),
    EntityConfig(entity_id="bldC", name="Library & Research Centre", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=150, amplitude=240, peak_hour=14, noise=10, min_val=40, max_val=650, alert_threshold=420),
        SensorParam(metric="temperature", unit="°C", base=20, amplitude=5, peak_hour=15, noise=0.3, min_val=16, max_val=34, alert_threshold=35),
        SensorParam(metric="air_quality", unit="AQI", base=25, amplitude=40, peak_hour=10, noise=3, min_val=8, max_val=180, alert_threshold=150),
    ]),
    EntityConfig(entity_id="bldD", name="Student Hostel Block", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=200, amplitude=160, peak_hour=21, noise=12, min_val=60, max_val=850, alert_threshold=420),
        SensorParam(metric="temperature", unit="°C", base=22, amplitude=4, peak_hour=20, noise=0.6, min_val=18, max_val=34, alert_threshold=35),
    ]),
    EntityConfig(entity_id="bldE", name="Utility & Power Station", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=40, amplitude=30, peak_hour=12, noise=3, min_val=10, max_val=120, alert_threshold=100),
    ]),
    EntityConfig(entity_id="bldF", name="Innovation Center", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=100, amplitude=150, peak_hour=14, noise=7, min_val=20, max_val=400, alert_threshold=380),
        SensorParam(metric="temperature", unit="°C", base=21, amplitude=5, peak_hour=14, noise=0.4, min_val=17, max_val=35, alert_threshold=33),
    ]),
    EntityConfig(entity_id="bldG", name="Sports Complex", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=130, amplitude=200, peak_hour=18, noise=9, min_val=30, max_val=500, alert_threshold=450),
    ]),
    EntityConfig(entity_id="bldH", name="Cafeteria", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=90, amplitude=140, peak_hour=12, noise=6, min_val=20, max_val=350, alert_threshold=320),
    ]),
    EntityConfig(entity_id="bldI", name="Medical Center", entity_type="building", sensors=[
        SensorParam(metric="energy", unit="kW", base=60, amplitude=40, peak_hour=10, noise=4, min_val=15, max_val=200, alert_threshold=180),
        SensorParam(metric="temperature", unit="°C", base=22, amplitude=3, peak_hour=12, noise=0.2, min_val=19, max_val=30, alert_threshold=28),
    ]),

    # Junctions
    EntityConfig(entity_id="jxn1", name="Main Gate Junction", entity_type="junction", sensors=[
        SensorParam(metric="traffic", unit="vehicles", base=10, amplitude=55, peak_hour=8, noise=5, min_val=0, max_val=100, alert_threshold=90),
    ]),
    EntityConfig(entity_id="jxn2", name="East Wing Junction", entity_type="junction", sensors=[
        SensorParam(metric="traffic", unit="vehicles", base=8, amplitude=45, peak_hour=8, noise=4, min_val=0, max_val=80, alert_threshold=70),
    ]),
    EntityConfig(entity_id="jxn3", name="Library Circle", entity_type="junction", sensors=[
        SensorParam(metric="traffic", unit="vehicles", base=12, amplitude=65, peak_hour=13, noise=6, min_val=0, max_val=120, alert_threshold=100),
    ]),
]

ENTITY_MAP: Dict[str, EntityConfig] = {e.entity_id: e for e in CAMPUS_ENTITIES}