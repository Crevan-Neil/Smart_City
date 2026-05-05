// ─────────────────────────────────────────────
//  routes/junctions.js — GET /api/junctions
// ─────────────────────────────────────────────

import { Router } from "express";
import Junction from "../../models/Junction.js";

const router = Router();

// GET /api/junctions
// Returns all campus junctions with their coords + default specs
router.get("/", async (_req, res, next) => {
  try {
    const junctions = await Junction.find({}).lean();
    res.json({ success: true, data: junctions });
  } catch (err) {
    console.error("[route/junctions] GET error:", err.message);
    next(err); // Pass to global error handler
  }
});

// GET /api/junctions/:id
// Returns a single junction by its entityId
router.get("/:id", async (req, res, next) => {
  try {
    const junction = await Junction.findOne({ entityId: req.params.id }).lean();
    if (!junction) {
      return res.status(404).json({ success: false, error: "Junction not found" });
    }
    res.json({ success: true, data: junction });
  } catch (err) {
    console.error("[route/junctions] GET /:id error:", err.message);
    next(err); // Pass to global error handler
  }
});

export default router;
