import type { Config } from "tailwindcss";

/**
 * Relay design system — "Aurora Command" identity (revamped).
 * Deep blue-black foundation · tuned electric-cyan primary · indigo-violet
 * secondary · cool-slate text · coral reserved for escalation & critical.
 *
 * Token names are stable (navy / teal / brand / severity / status) so every
 * component class and page keeps working; only the values change. Values are
 * tuned for WCAG 2.2 AA contrast on the dark surfaces and a refined,
 * high-craft operations-console feel (no neon glow).
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Blue-black surface scale (deepest → raised).
        navy: {
          950: "#080a12", // app background
          900: "#0e1220", // surface
          800: "#151a2b", // raised surface
          700: "#1e2540", // lines / hover
          600: "#2b3357", // strong line
        },
        slate: {
          850: "#141a29",
        },
        // Electric cyan — the primary / accent.
        teal: {
          DEFAULT: "#2dd4e8",
          400: "#4ee2f4",
          500: "#1fc3d8",
          600: "#159fb4",
        },
        // Indigo-violet — secondary emphasis (workflow, automation, orchestration).
        brand: {
          DEFAULT: "#7c7bff",
          400: "#9d93ff",
          500: "#7c7bff",
          600: "#6355e6",
        },
        severity: {
          critical: "#fb5469",
          high: "#ff9a4d",
          medium: "#f6c955",
          low: "#8ea2ff",
          info: "#8b94b8",
        },
        status: {
          healthy: "#2ee6b6",
          degraded: "#f6c955",
          impaired: "#ff9a4d",
          down: "#fb5469",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 34px -16px rgba(0,0,0,0.7)",
        glow: "0 0 0 1px rgba(45,212,232,0.35), 0 8px 24px -10px rgba(45,212,232,0.35)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
