import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "vision-black": "#080B0F",
        "vision-dark": "#0D1117",
        "vision-surface": "#111827",
        "vision-green": "#4ADE80",
        "vision-green-dark": "#22C55E",
        "vision-gold": "#FACC15",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        ticker: "ticker 30s linear infinite",
      },
      keyframes: {
        "pulse-green": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
