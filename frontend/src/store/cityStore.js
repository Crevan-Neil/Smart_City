// ─────────────────────────────────────────────
//  store/cityStore.js
//  Zustand — buildings, junctions, live sensor data
// ─────────────────────────────────────────────

import { create } from "zustand";

const useCityStore = create((set, get) => ({
  // ── Static city config (loaded from MongoDB via API) ──
  buildings: [],        // array of building objects from /api/buildings
  junctions: [],        // array of junction objects

  // ── Live sensor state (keyed by entityId) ──
  // Shape: { bldA: { energy: 42, temperature: 24, air_quality: 80 }, ... }
  sensorData: {},

  // ── Anomaly alerts queue ──
  anomalies: [],        // max 10 kept in memory

  // ── Connection status ──
  isConnected: false,

  // ── Actions ──

  setBuildings: (buildings) => set({ buildings }),
  setJunctions: (junctions) => set({ junctions }),

  setConnected: (status) => set({ isConnected: status }),

  // Called on every city_update socket event
  updateSensor: ({ entityId, metric, value, timestamp }) => {
    set((state) => ({
      sensorData: {
        ...state.sensorData,
        [entityId]: {
          ...state.sensorData[entityId],
          [metric]: value,
          lastUpdated: timestamp || new Date().toISOString(),
        },
      },
    }));
  },

  // Add an anomaly alert (keep last 10)
  addAnomaly: (alert) => {
    set((state) => ({
      anomalies: [alert, ...state.anomalies].slice(0, 10),
    }));
  },

  dismissAnomaly: (index) => {
    set((state) => ({
      anomalies: state.anomalies.filter((_, i) => i !== index),
    }));
  },

  // Update an existing anomaly with AI narration
  updateAnomalyNarration: (entityId, narration) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.entityId === entityId ? { ...a, narration } : a
      ),
    }));
  },

  // ── Selectors ──

  getSensorValue: (entityId, metric) => {
    const data = get().sensorData[entityId];
    return data ? data[metric] ?? null : null;
  },

  getBuildingById: (entityId) => {
    return get().buildings.find((b) => b.entityId === entityId) ?? null;
  },

  // Normalise a sensor value 0→1 relative to its building's maxCapacity
  getNormalisedEnergy: (entityId) => {
    const building = get().getBuildingById(entityId);
    const value = get().getSensorValue(entityId, "energy");
    if (!building || value === null) return 0;
    return Math.min(value / building.maxCapacity, 1);
  },
}));

export default useCityStore;