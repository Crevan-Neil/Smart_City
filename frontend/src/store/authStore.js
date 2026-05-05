// ─────────────────────────────────────────────
//  store/authStore.js
//  Zustand — Auth state: user, token, actions
// ─────────────────────────────────────────────

import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  isAuthenticated: false,
  isInitializing: true,
  error: null,

  // ── Actions ──

  initAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isInitializing: false });
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/auth/verify`, { token });
      if (res.data.success && res.data.valid) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        get().logout();
      }
    } catch (err) {
      console.error("[authStore] verify error:", err.message);
      get().logout();
    }
  },

  login: async (identifier, password) => {
    set({ error: null });
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        identifier,
        password,
      });

      const { token, user } = res.data;
      localStorage.setItem("token", token);
      set({
        token,
        user,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || "Login failed";
      set({ error: msg });
      return false;
    }
  },

  register: async (data) => {
    set({ error: null });
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, data);
      const { token, user } = res.data;
      
      localStorage.setItem("token", token);
      set({
        token,
        user,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      set({ error: msg });
      return false;
    }
  },

  logout: async () => {
    const token = get().token;
    if (token) {
      // Best effort logout on backend
      try {
        await axios.post(`${API_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn("[authStore] backend logout failed:", err.message);
      }
    }

    localStorage.removeItem("token");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitializing: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
