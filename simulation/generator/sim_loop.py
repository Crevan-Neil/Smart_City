# ─────────────────────────────────────────────
#  simulation/generator/sim_loop.py
#  Main async simulation loop
#
#  Every SIM_INTERVAL_SEC seconds:
#    1. Advance the sim clock
#    2. Generate a new value for every sensor
#    3. Publish each reading to Redis Pub/Sub
# ─────────────────────────────────────────────

import asyncio
from datetime import datetime, timezone

from config import settings
from generator.city_config import CAMPUS_ENTITIES
from generator.random_walk import get_generator
from publisher.redis_pub import publish_event


class SimLoop:
    """
    Async simulation loop — runs as a background task.
    Advances a virtual 24-hour clock and generates
    sensor readings for every campus entity each tick.
    """

    def __init__(self):
        self.running: bool = False
        self.tick: int = 0

        # Sim clock: starts at midnight by default
        self._sim_hour: float = 0.0
        self._active_events: list[dict] = []

    # ── Public interface ──────────────────────

    async def run(self) -> None:
        """Start the simulation loop. Runs until stop() is called."""
        self.running = True
        print(
            f"[sim_loop] starting — "
            f"interval={settings.SIM_INTERVAL_SEC}s, "
            f"entities={len(CAMPUS_ENTITIES)}"
        )

        while self.running:
            start = asyncio.get_event_loop().time()

            await self._tick()

            # Sleep for the remainder of the interval
            elapsed = asyncio.get_event_loop().time() - start
            sleep_for = max(0.0, settings.SIM_INTERVAL_SEC - elapsed)
            await asyncio.sleep(sleep_for)

    async def stop(self) -> None:
        """Gracefully stop the simulation loop."""
        self.running = False
        print(f"[sim_loop] stopped after {self.tick} ticks")

    def get_status(self) -> dict:
        """Return current loop state for the /status endpoint."""
        h = int(self._sim_hour)
        m = int((self._sim_hour - h) * 60)
        return {
            "running": self.running,
            "tick": self.tick,
            "sim_time": f"{h:02d}:{m:02d}",
            "sim_hour": round(self._sim_hour, 2),
            "active_events": self._active_events,
            "entities": len(CAMPUS_ENTITIES),
        }

    # ── Internal ──────────────────────────────

    async def _tick(self) -> None:
        """One simulation tick — advance clock, generate and publish all readings."""
        self.tick += 1

        # Advance sim clock
        self._sim_hour = (
            self._sim_hour + settings.SIM_MINUTES_PER_TICK / 60
        ) % 24

        generator = get_generator()
        timestamp = datetime.now(timezone.utc).isoformat()

        publish_tasks = []

        for entity in CAMPUS_ENTITIES:
            for sensor in entity.sensors:
                value = generator.generate(
                    entity_id=entity.entity_id,
                    param=sensor,
                    sim_hour=self._sim_hour,
                )

                event = {
                    "entityId":   entity.entity_id,
                    "entityType": entity.entity_type,
                    "metric":     sensor.metric,
                    "value":      value,
                    "unit":       sensor.unit,
                    "timestamp":  timestamp,
                    "simHour":    round(self._sim_hour, 2),
                }

                publish_tasks.append(publish_event(event))

        # Publish all events concurrently for this tick
        await asyncio.gather(*publish_tasks, return_exceptions=True)

        if self.tick % 30 == 0:
            h = int(self._sim_hour)
            m = int((self._sim_hour - h) * 60)
            print(
                f"[sim_loop] tick={self.tick} "
                f"sim_time={h:02d}:{m:02d} "
                f"events_published={len(publish_tasks)}"
            )