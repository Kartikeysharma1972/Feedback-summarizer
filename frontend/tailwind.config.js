/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        "primary-light": "#3b82f6",
        "primary-dark": "#1d4ed8",
        accent: "#0ea5e9",
        surface: "#ffffff",
        panel: "#f0f9ff",
        "surface-hover": "#e0f2fe",
        border: "#bae6fd",
        "border-light": "#e0f2fe",
        "text-primary": "#0f172a",
        "text-secondary": "#475569",
        muted: "#94a3b8",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        slideUp: "slideUp 0.5s ease-out",
        fadeIn: "fadeIn 0.6s ease-out",
        float: "float 6s ease-in-out infinite",
        scaleIn: "scaleIn 0.3s ease-out",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
