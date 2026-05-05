# ─────────────────────────────────────────────
#  simulation/generator/sine_pattern.py
#  Daily sine wave overlay
#
#  Produces realistic-looking data that peaks
#  at the right time of day instead of random noise.
#
#  Formula:
#    value(t) = base + amplitude * sin(2π(t - peak_hour)/24)
#
#  Dual-peak variant (for traffic):
#    value(t) = base
#             + amp1 * sin(2π(t - peak1)/24)
#             + amp2 * sin(2π(t - peak2)/24)
# ─────────────────────────────────────────────

import math


def sine_value(
    hour: float,
    base: float,
    amplitude: float,
    peak_hour: float,
) -> float:
    """
    Single sine wave — one peak per day.

    Args:
        hour:       current sim hour (0.0–23.99)
        base:       midnight (trough) baseline value
        amplitude:  peak-to-trough swing
        peak_hour:  hour of day when value is highest
    """
    # Phase shift so the peak aligns with peak_hour
    phase = 2 * math.pi * (hour - peak_hour) / 24
    return base + amplitude * math.sin(phase)


def dual_peak_sine(
    hour: float,
    base: float,
    amplitude: float,
    peak_hour_1: float = 8.0,   # morning rush
    peak_hour_2: float = 17.0,  # evening rush
) -> float:
    """
    Two-sine overlay — two peaks per day.
    Used for traffic: morning commute + evening return.

    The two waves are weighted 60/40 (morning slightly higher).
    """
    wave_1 = 0.6 * amplitude * math.sin(
        2 * math.pi * (hour - peak_hour_1) / 24
    )
    wave_2 = 0.4 * amplitude * math.sin(
        2 * math.pi * (hour - peak_hour_2) / 24
    )
    return max(base + wave_1 + wave_2, 0)


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max."""
    return max(min_val, min(max_val, value))