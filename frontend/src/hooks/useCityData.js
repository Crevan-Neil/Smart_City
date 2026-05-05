// ─────────────────────────────────────────────
//  hooks/useCityData.js
//  Fetches static city config from backend API
//  and seeds the Zustand store on mount
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import useCityStore from "../store/cityStore";
import useAuthStore from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useCityData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setBuildings = useCityStore((s) => s.setBuildings);
  const setJunctions = useCityStore((s) => s.setJunctions);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchCityConfig() {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [bldRes, jxnRes] = await Promise.all([
          fetch(`${API_URL}/api/buildings`, { headers }),
          fetch(`${API_URL}/api/junctions`, { headers }),
        ]);

        if (!bldRes.ok) throw new Error("Failed to fetch buildings");
        if (!jxnRes.ok) throw new Error("Failed to fetch junctions");

        const [bldData, jxnData] = await Promise.all([
          bldRes.json(),
          jxnRes.json(),
        ]);

        setBuildings(bldData.data || []);
        setJunctions(jxnData.data || []);
        setLoading(false);
      } catch (err) {
        console.error("[useCityData]", err.message);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchCityConfig();
  }, [isAuthenticated, token]);

  return { loading, error };
}

// ── Sensor history fetcher ────────────────────
export function useSensorHistory(entityId, metric, range = "-1h") {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!entityId || !metric) return;

    setLoading(true);
    fetch(
      `${API_URL}/api/sensors/history?entityId=${entityId}&metric=${metric}&range=${range}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useSensorHistory]", err.message);
        setLoading(false);
      });
  }, [entityId, metric, range, token]);

  return { history, loading };
}