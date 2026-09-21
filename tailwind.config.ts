import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Midnight navy operations command-centre palette.
        navy: {
          950: "#0a0f1c",
          900: "#0d1526",
          800: "#111c33",
          700: "#16233f",
          600: "#1d2e4f",
        },
        slate: {
          850: "#1b2537",
        },
        teal: {
          DEFAULT: "#2dd4bf",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
        severity: {
          critical: "#f43f5e",
          high: "#fb923c",
          medium: "#facc15",
          low: "#38bdf8",
          info: "#94a3b8",
        },
        status: {
          healthy: "#34d399",
          degraded: "#facc15",
          impaired: "#fb923c",
          down: "#f43f5e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
