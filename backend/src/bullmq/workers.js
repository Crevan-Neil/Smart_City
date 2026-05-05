// ─────────────────────────────────────────────
//  bullmq/workers.js
//  Processes simulation queue jobs
//  → POSTs job params to Python /trigger endpoint
// ─────────────────────────────────────────────

import { Worker } from "bullmq";
import axios from "axios";
import { getRedisClient } from "../config/redis.js";

const SIM_URL = process.env.SIM_URL || "http://localhost:8000";

let worker = null;

export function initWorkers() {
  const connection = getRedisClient();

  worker = new Worker(
    "simulation",
    async (job) => {
      console.log(`[worker] processing job ${job.id} — type: ${job.data.type}`);

      const { type, entityId, duration, intensity } = job.data;

      try {
        const response = await axios.post(
          `${SIM_URL}/trigger`,
          { type, entityId, duration, intensity },
          { timeout: 10_000 }
        );

        console.log(
          `[worker] job ${job.id} dispatched — sim responded:`,
          response.data
        );

        return response.data;
      } catch (err) {
        console.error(
          `[worker] job ${job.id} failed — could not reach sim:`,
          err.message
        );
        throw err; // BullMQ will retry based on queue defaultJobOptions
      }
    },
    {
      connection,
      concurrency: 3, // process up to 3 sim jobs simultaneously
    }
  );

  worker.on("completed", (job) =>
    console.log(`[worker] job ${job.id} completed`)
  );

  worker.on("failed", (job, err) =>
    console.error(`[worker] job ${job?.id} failed after retries:`, err.message)
  );

  console.log("[bullmq] worker listening on simulation queue");
}

export async function shutdownWorkers() {
  if (worker) await worker.close();
}