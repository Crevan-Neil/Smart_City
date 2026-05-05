// ─────────────────────────────────────────────
//  store/uiStore.js
//  Zustand — UI state: selected node, open panels
// ─────────────────────────────────────────────

import { create } from "zustand";

const useUIStore = create((set) => ({
  // ── Selected entity in the 3D scene ──
  selectedEntityId: null,
  selectedEntityType: null, // "building" | "junction"

  // ── Panel visibility ──
  isSidebarOpen: true,
  isAiPanelOpen: false,
  isCommandPanelOpen: false,

  // ── Camera ──
  cameraTarget: [0, 0, 0],
  cameraMode: "orbit",   // "orbit" | "flyto" | "topdown"

  // ── Time simulation ──
  simHour: 12,           // 0–23, drives sine wave in 3D color mapping
  isSimRunning: true,

  // ── Actions ──

  selectEntity: (entityId, entityType) =>
    set({ selectedEntityId: entityId, selectedEntityType: entityType }),

  clearSelection: () =>
    set({ selectedEntityId: null, selectedEntityType: null }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openAiPanel: () => set({ isAiPanelOpen: true }),
  closeAiPanel: () => set({ isAiPanelOpen: false }),
  toggleAiPanel: () =>
    set((state) => ({ isAiPanelOpen: !state.isAiPanelOpen })),

  toggleCommandPanel: () =>
    set((state) => ({ isCommandPanelOpen: !state.isCommandPanelOpen })),

  setCameraTarget: (target) => set({ cameraTarget: target }),
  setCameraMode: (mode) => set({ cameraMode: mode }),

  setSimHour: (hour) => set({ simHour: hour }),
  toggleSim: () => set((state) => ({ isSimRunning: !state.isSimRunning })),
}));

export default useUIStore;