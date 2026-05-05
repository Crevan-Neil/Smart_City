// ─────────────────────────────────────────────
//  config/redis.js — ioredis client
// ─────────────────────────────────────────────

import Redis from "ioredis";

// Main client — used for GET/SET/PUBLISH
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

// Subscriber client — a separate connection is required
let subscriberClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

export async function connectRedis() {
  await new Promise((resolve, reject) => {
    if (redisClient.status === "ready") return resolve();
    redisClient.once("ready", resolve);
    redisClient.once("error", reject);
  });

  console.log("[redis] connected");
  return { redisClient, subscriberClient };
}

export function getRedisClient() {
  return redisClient;
}

export function getSubscriberClient() {
  return subscriberClient;
}