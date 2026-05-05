// ─────────────────────────────────────────────
//  routes/simulation.js — POST /api/sim/trigger
//  Receives commands from the frontend AI panel
//  and enqueues them as BullMQ jobs
// ─────────────────────────────────────────────

import { Router } from "express";
import { z } from "zod";
import { enqueueSimJob, getSimulationQueue } from "../bullmq/queues.js";

const router = Router();

const TriggerSimulationSchema = z.object({
  type: z.enum(["traffic_surge", "power_spike", "air_quality_drop", "custom"]).default("custom"),
  entityId: z.string({ required_error: "entityId is required" }).min(1, "entityId cannot be empty"),
  duration: z.number().int().positive().default(30),
  intensity: z.number().min(0.1, "intensity must be at least 0.1").max(10, "intensity cannot exceed 10").default(2.0),
  priority: z.number().int().positive().default(5),
});

// POST /api/sim/trigger
// Body: { type, entityId, duration, intensity }
router.post("/trigger", async (req, res, next) => {
  try {
    const { type, entityId, duration, intensity, priority } = TriggerSimulationSchema.parse(req.body);
    const jobId = await enqueueSimJob({ type, entityId, duration, intensity, priority });
    res.json({
      success: true,
      jobId,
      message: `Simulation job queued — ${type} on ${entityId} for ${duration}s`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sim/status
// Returns queue depth and recent job stats
router.get("/status", async (_req, res) => {
  try {
    const queue = getSimulationQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    res.json({
      success: true,
      queue: { waiting, active, completed, failed },
    });
  } catch (err) {
    next(err);
  }
});

export default router;