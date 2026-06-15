import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        charcoal: {
          DEFAULT: "var(--text-primary)",
          light: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        brand: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          150: "#FDE9A8",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F5A623",
          600: "#E09515",
          700: "#C47D0E",
          800: "#92400E",
          900: "#78350F",
        },
        surface: {
          DEFAULT: "var(--background)",
          muted: "var(--surface-muted)",
          card: "var(--surface-card)",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "var(--danger-soft)",
        },
        success: {
          DEFAULT: "#15803D",
          soft: "var(--success-soft)",
        },
        /* Legacy aliases */
        "servora-charcoal": "var(--text-primary)",
        "servora-yellow": "#F5A623",
        "servora-red": "#DC2626",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        btn: "0 1px 2px rgb(196 125 14 / 0.35), 0 2px 6px rgb(245 166 35 / 0.25)",
        header: "var(--shadow-header)",
        inset: "inset 0 1px 2px rgb(43 43 43 / 0.04)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #FBBF24 0%, #F5A623 50%, #E09515 100%)",
        "brand-gradient-soft": "var(--brand-gradient-soft)",
        "sidebar-active": "linear-gradient(135deg, #FBBF24 0%, #F5A623 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
