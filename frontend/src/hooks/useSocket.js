// ─────────────────────────────────────────────
//  hooks/useSocket.js
//  Manages the Socket.io connection lifecycle
//  Feeds incoming events into Zustand stores
// ─────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useCityStore from "../store/cityStore";
import useAuthStore from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

let socketInstance = null; // singleton — one connection for the app lifetime

export function useSocket() {
  const initialised = useRef(false);

  const setConnected = useCityStore((s) => s.setConnected);
  const updateSensor = useCityStore((s) => s.updateSensor);
  const addAnomaly = useCityStore((s) => s.addAnomaly);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        initialised.current = false;
      }
      return;
    }

    if (initialised.current) return;
    initialised.current = true;

    socketInstance = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token },
    });

    socketInstance.on("connect", () => {
      console.log("[socket] connected —", socketInstance.id);
      setConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("[socket] disconnected —", reason);
      setConnected(false);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("[socket] connection error —", err.message);
      setConnected(false);
    });

    // Live sensor readings from the simulation
    socketInstance.on("city_update", (event) => {
      updateSensor(event);
    });

    // Threshold breach alerts from the backend
    socketInstance.on("anomaly_alert", (alert) => {
      addAnomaly(alert);
    });

    // AI narration for a specific anomaly
    socketInstance.on("ai_narration", (data) => {
      const updateAnomalyNarration = useCityStore.getState().updateAnomalyNarration;
      updateAnomalyNarration(data.entityId, data.narration);
    });

    return () => {
      socketInstance?.disconnect();
      socketInstance = null;
      initialised.current = false;
    };
  }, [isAuthenticated, token]);

  return socketInstance;
}

export function getSocket() {
  return socketInstance;
}