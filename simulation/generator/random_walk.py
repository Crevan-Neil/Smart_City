# ─────────────────────────────────────────────
#  simulation/generator/random_walk.py
#  Stochastic sensor value generator
#
#  Combines:
#    1. Sine-wave base   — realistic time-of-day pattern
#    2. Random walk      — smooth drift between ticks
#    3. Gaussian noise   — realistic sensor jitter
#    4. Event injection  — temporary spikes (from /trigger)
#
#  Each entity's sensor maintains its own state
#  so the random walk has memory (no sudden jumps).
# ─────────────────────────────────────────────

import random
import math
from dataclasses import dataclass, field
from typing import Dict, Tuple

from generator.city_config import SensorParam
from generator.sine_pattern import sine_value, dual_peak_sine, clamp


@dataclass
class SensorState:
    """Mutable state for one sensor across ticks."""
    current_value: float = 0.0
    walk_offset: float = 0.0    # accumulated random walk drift
    event_boost: float = 0.0    # temporary boost from an injected event
    event_ticks_left: int = 0   # ticks remaining for the active event


class RandomWalkGenerator:
    """
    Generates plausible sensor readings for all campus entities.
    Maintains per-sensor state for smooth continuity between ticks.
    """

    def __init__(self):
        # { (entity_id, metric): SensorState }
        self._states: Dict[Tuple[str, str], SensorState] = {}

    def _get_state(self, entity_id: str, metric: str) -> SensorState:
        key = (entity_id, metric)
        if key not in self._states:
            self._states[key] = SensorState()
        return self._states[key]

    def generate(
        self,
        entity_id: str,
        param: SensorParam,
        sim_hour: float,
    ) -> float:
        """
        Generate the next sensor value for one metric on one entity.

        Args:
            entity_id: e.g. "bldA"
            param:     SensorParam config for this metric
            sim_hour:  current simulation hour (0.0–23.99)

        Returns:
            Sensor value clamped to [min_val, max_val]
        """
        state = self._get_state(entity_id, param.metric)

        # ── 1. Sine-wave base (time-of-day pattern) ──
        if param.metric == "traffic":
            # Traffic uses dual-peak (morning + evening rush)
            base_value = dual_peak_sine(
                hour=sim_hour,
                base=param.base,
                amplitude=param.amplitude,
                peak_hour_1=8.0,
                peak_hour_2=17.0,
            )
        else:
            base_value = sine_value(
                hour=sim_hour,
                base=param.base,
                amplitude=param.amplitude,
                peak_hour=param.peak_hour,
            )

        # ── 2. Random walk drift ──────────────────────
        # Drift slowly toward zero to prevent unbounded drift
        drift_decay = 0.92
        state.walk_offset *= drift_decay
        state.walk_offset += random.gauss(0, param.noise * 0.4)

        # ── 3. Gaussian sensor noise ──────────────────
        noise = random.gauss(0, param.noise * 0.6)

        # ── 4. Event boost (from /trigger endpoint) ───
        event_contribution = 0.0
        if state.event_ticks_left > 0:
            event_contribution = state.event_boost
            state.event_ticks_left -= 1
            # Taper off in the last 20% of the event
            taper_start = max(1, state.event_ticks_left * 0.2)
            if state.event_ticks_left < taper_start:
                taper_ratio = state.event_ticks_left / taper_start
                event_contribution *= taper_ratio
        else:
            state.event_boost = 0.0

        # ── 5. Combine all contributions ─────────────
        raw = base_value + state.walk_offset + noise + event_contribution

        # ── 6. Clamp to physical limits ───────────────
        value = clamp(raw, param.min_val, param.max_val)
        state.current_value = value

        return round(value, 2)

    def inject_event(
        self,
        entity_id: str,
        metric: str,
        intensity: float,
        duration_ticks: int,
    ) -> None:
        """
        Inject a temporary boost into a sensor's value.
        Called by the /trigger endpoint.

        Args:
            entity_id:      e.g. "bldA"
            metric:         e.g. "energy"
            intensity:      multiplier applied to the current value (e.g. 2.5)
            duration_ticks: how many ticks the boost lasts
        """
        state = self._get_state(entity_id, metric)

        # Boost = (intensity - 1) * current value
        # So intensity=2.0 doubles the reading above the baseline
        boost = (intensity - 1.0) * max(state.current_value, 1.0)
        state.event_boost = boost
        state.event_ticks_left = duration_ticks

        print(
            f"[sim] event injected — {entity_id}.{metric} "
            f"+{boost:.1f} for {duration_ticks} ticks "
            f"(intensity={intensity}×)"
        )

    def get_current(self, entity_id: str, metric: str) -> float | None:
        """Return the last generated value for a sensor, or None."""
        state = self._states.get((entity_id, metric))
        return state.current_value if state else None


# ── Module-level singleton ─────────────────────
_generator = RandomWalkGenerator()


def get_generator() -> RandomWalkGenerator:
    return _generator