import type { Config } from "tailwindcss";

/**
 * Relay design system — "Control Centre" identity.
 * Deep indigo / midnight-violet surfaces · electric cyan primary ·
 * cool-steel text · coral/magenta reserved for escalation & critical.
 *
 * Token names are internal; values define the identity. Severity/status keys
 * are stable so component classes stay valid.
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
        // Indigo / midnight-violet surface scale (deepest → raised).
        navy: {
          950: "#070711", // app background
          900: "#0d0c1b", // surface
          800: "#14132a", // raised surface
          700: "#1b1938", // lines / hover
          600: "#272449", // strong line
        },
        slate: {
          850: "#15152b",
        },
        // Electric cyan — the primary / accent.
        teal: {
          DEFAULT: "#2fd9f2",
          400: "#45e3ff",
          500: "#1ec8e6",
          600: "#12a6c2",
        },
        // Violet — secondary emphasis (workflow, automation, orchestration).
        brand: {
          DEFAULT: "#7c6bff",
          400: "#9183ff",
          500: "#7c6bff",
          600: "#6450e6",
        },
        severity: {
          critical: "#ff4d6d",
          high: "#ff9f45",
          medium: "#f7c948",
          low: "#8ea2ff",
          info: "#8b93b5",
        },
        status: {
          healthy: "#2fe0bd",
          degraded: "#f7c948",
          impaired: "#ff9f45",
          down: "#ff4d6d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.625rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
