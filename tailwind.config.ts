import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "servora-charcoal": "#2B2B2B",
        "servora-yellow": "#F5A623",
        "servora-red": "#DC2626",
      },
    },
  },
  plugins: [],
};
export default config;
