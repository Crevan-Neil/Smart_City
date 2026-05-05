// ─────────────────────────────────────────────
//  src/seed.js — MongoDB seed script
//  Run once: npm run seed
//  Inserts campus buildings, junctions,
//  sensor specs, and a default admin user
// ─────────────────────────────────────────────

import "dotenv/config";
import mongoose from "mongoose";

// ── Import shared root-level models ──────────
import Building from "../models/Building.js";
import Junction from "../models/Junction.js";
import SensorSpec from "../models/SensorSpec.js";
import User from "../models/User.js";

// ── Seed data ─────────────────────────────────

const buildings = [
  {
    entityId: "bldA",
    name: "Engineering Block A",
    coords: { lat: 13.3409, lng: 74.7421 },
    scenePosition: { x: -15, y: 0, z: -10 },
    floorCount: 4,
    maxCapacity: 450,
    type: "academic",
    sensors: ["energy", "temperature", "air_quality"],
  },
  {
    entityId: "bldB",
    name: "Main Admin Block",
    coords: { lat: 13.3412, lng: 74.7425 },
    scenePosition: { x: 0, y: 0, z: -10 },
    floorCount: 3,
    maxCapacity: 320,
    type: "admin",
    sensors: ["energy", "temperature"],
  },
  {
    entityId: "bldC",
    name: "Library & Research Centre",
    coords: { lat: 13.3415, lng: 74.7430 },
    scenePosition: { x: 15, y: 0, z: -10 },
    floorCount: 5,
    maxCapacity: 600,
    type: "academic",
    sensors: ["energy", "temperature", "air_quality"],
  },
  {
    entityId: "bldD",
    name: "Student Hostel Block",
    coords: { lat: 13.3407, lng: 74.7435 },
    scenePosition: { x: -15, y: 0, z: 10 },
    floorCount: 6,
    maxCapacity: 800,
    type: "residential",
    sensors: ["energy", "temperature"],
  },
  {
    entityId: "bldE",
    name: "Utility & Power Station",
    coords: { lat: 13.3418, lng: 74.7418 },
    scenePosition: { x: 15, y: 0, z: 10 },
    floorCount: 1,
    maxCapacity: 100,
    type: "utility",
    sensors: ["energy"],
  },
];

const junctions = [
  {
    entityId: "jxn1",
    name: "Main Gate Junction",
    coords: { lat: 13.3405, lng: 74.7422 },
    scenePosition: { x: 0, y: 0, z: 20 },
    defaultPhaseDuration: 30,
  },
];

const sensorSpecs = [
  {
    metric: "energy",
    unit: "kW",
    minNormal: 50,
    maxNormal: 400,
    alertThreshold: 420,
    description: "Electricity consumption in kilowatts",
  },
  {
    metric: "temperature",
    unit: "°C",
    minNormal: 18,
    maxNormal: 32,
    alertThreshold: 35,
    description: "Indoor ambient temperature",
  },
  {
    metric: "air_quality",
    unit: "AQI",
    minNormal: 0,
    maxNormal: 100,
    alertThreshold: 150,
    description: "Air Quality Index — lower is better",
  },
  {
    metric: "traffic",
    unit: "vehicles",
    minNormal: 0,
    maxNormal: 80,
    alertThreshold: 90,
    description: "Vehicle count at junction per minute",
  },
];

// ── Default users ─────────────────────────────
// Passwords are hashed by the User model's pre-save hook
const users = [
  {
    username: "admin",
    email: "admin@smartcity.local",
    password: process.env.SEED_ADMIN_PASS || "Admin@123",
    role: "admin",
    allowedBuildings: [], // empty = access to all
  },
  {
    username: "operator",
    email: "operator@smartcity.local",
    password: process.env.SEED_OPERATOR_PASS || "Operator@123",
    role: "operator",
    allowedBuildings: ["bldA", "bldB", "bldC"],
  },
  {
    username: "viewer",
    email: "viewer@smartcity.local",
    password: process.env.SEED_VIEWER_PASS || "Viewer@123",
    role: "viewer",
    allowedBuildings: ["bldA"],
  },
];

// ── Run seed ──────────────────────────────────
async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed] MONGO_URI not set in environment");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[seed] connected to MongoDB\n");

  // ── Buildings ──
  await Building.deleteMany({});
  await Building.insertMany(buildings);
  console.log(`[seed] ✓ inserted ${buildings.length} buildings`);

  // ── Junctions ──
  await Junction.deleteMany({});
  await Junction.insertMany(junctions);
  console.log(`[seed] ✓ inserted ${junctions.length} junctions`);

  // ── Sensor specs ──
  await SensorSpec.deleteMany({});
  await SensorSpec.insertMany(sensorSpecs);
  console.log(`[seed] ✓ inserted ${sensorSpecs.length} sensor specs`);

  // ── Users — use create() not insertMany() so the pre-save hook hashes passwords ──
  await User.deleteMany({});
  for (const userData of users) {
    await User.create(userData);
    console.log(`[seed] ✓ created user: ${userData.username} (${userData.role})`);
  }

  // ── Summary ──
  console.log("\n[seed] ─────────────────────────────────");
  console.log("[seed] MongoDB seeded successfully");
  console.log("[seed] Default login credentials:");
  console.log(`       admin    / ${process.env.SEED_ADMIN_PASS || "Admin@123"}`);
  console.log(`       operator / ${process.env.SEED_OPERATOR_PASS || "Operator@123"}`);
  console.log(`       viewer   / ${process.env.SEED_VIEWER_PASS || "Viewer@123"}`);
  console.log("[seed] Change these immediately in production via .env");
  console.log("[seed] ─────────────────────────────────\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});