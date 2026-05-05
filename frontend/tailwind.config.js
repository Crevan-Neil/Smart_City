// ─────────────────────────────────────────────
//  tailwind.config.js
// ─────────────────────────────────────────────

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        city: {
          bg:     "#06121e",
          bg2:    "#0a1f33",
          cyan:   "#00e5ff",
          green:  "#00e5a0",
          amber:  "#f59e0b",
          red:    "#ef4444",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};