// ─────────────────────────────────────────────
//  routes/buildings.js — GET /api/buildings
// ─────────────────────────────────────────────

import { Router } from "express";
import Building from "../../models/Building.js";

const router = Router();

// GET /api/buildings
// Returns all campus buildings with their coords + sensor specs
router.get("/", async (_req, res) => {
  try {
    const buildings = await Building.find({}).lean();
    res.json({ success: true, data: buildings });
  } catch (err) {
    console.error("[route/buildings] GET error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch buildings" });
  }
});

// GET /api/buildings/:id
// Returns a single building by its entityId
router.get("/:id", async (req, res) => {
  try {
    const building = await Building.findOne({ entityId: req.params.id }).lean();
    if (!building) {
      return res.status(404).json({ success: false, error: "Building not found" });
    }
    res.json({ success: true, data: building });
  } catch (err) {
    console.error("[route/buildings] GET /:id error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch building" });
  }
});

export default router;