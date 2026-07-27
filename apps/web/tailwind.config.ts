import type { Config } from "tailwindcss";

// Phase 2 design tokens — see docs/PHASE-2-DESIGN-SYSTEM.md
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-void": "#0A0F1C",
        "bg-surface": "#111A2B",
        "bg-surface-raised": "#17223A",
        "border-hairline": "rgba(255,255,255,0.08)",
        "accent-cyan": "#3AD1F2",
        "accent-electric": "#4C7CFF",
        "warn-amber": "#F2A93C",
        "danger-red": "#FF4D5E",
        "success-green": "#2ED9A0",
        "text-primary": "#F2F5FA",
        "text-muted": "#8CA0C2",
        "text-disabled": "#4B5A76",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-plex-sans)", "sans-serif"],
        data: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.35)",
        sos: "0 8px 20px rgba(255,77,94,0.45)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.9" },
          "70%": { transform: "scale(1.55)", opacity: "0" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
