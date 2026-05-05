// ─────────────────────────────────────────────
//  bullmq/queues.js — BullMQ queue definitions
// ─────────────────────────────────────────────

import { Queue } from "bullmq";
import { getRedisClient } from "../config/redis.js";

let simulationQueue = null;

export function getSimulationQueue() {
  if (!simulationQueue) {
    const connection = getRedisClient();

    simulationQueue = new Queue("simulation", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 50,  // keep last 50 completed jobs
        removeOnFail: 20,      // keep last 20 failed jobs
      },
    });

    console.log("[bullmq] simulation queue ready");
  }
  return simulationQueue;
}

/**
 * Add a simulation trigger job to the queue
 *
 * @param {object} params
 * @param {string} params.type     — "traffic_surge" | "power_spike" | "custom"
 * @param {string} params.entityId — which building/junction to affect
 * @param {number} params.duration — how long (seconds) the event lasts
 * @param {number} params.intensity — multiplier on normal values (e.g. 2.5)
 */
export async function enqueueSimJob(params) {
  const queue = getSimulationQueue();
  const job = await queue.add("trigger", params, {
    priority: params.priority || 5,
  });
  console.log(`[bullmq] job enqueued — id: ${job.id}, type: ${params.type}`);
  return job.id;
}