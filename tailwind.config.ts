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
        charcoal: {
          DEFAULT: "#2B2B2B",
          light: "#4A4A4A",
          muted: "#6B7280",
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
          DEFAULT: "#FAFAF8",
          muted: "#F5F4F0",
          card: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2",
        },
        success: {
          DEFAULT: "#15803D",
          soft: "#F0FDF4",
        },
        /* Legacy aliases */
        "servora-charcoal": "#2B2B2B",
        "servora-yellow": "#F5A623",
        "servora-red": "#DC2626",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(245 166 35 / 0.08), 0 4px 12px -2px rgb(43 43 43 / 0.06)",
        "card-hover":
          "0 4px 16px -2px rgb(245 166 35 / 0.15), 0 8px 24px -4px rgb(43 43 43 / 0.08)",
        btn: "0 1px 2px rgb(196 125 14 / 0.35), 0 2px 6px rgb(245 166 35 / 0.25)",
        header: "0 2px 12px -2px rgb(245 166 35 / 0.12)",
        inset: "inset 0 1px 2px rgb(43 43 43 / 0.04)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #FBBF24 0%, #F5A623 50%, #E09515 100%)",
        "brand-gradient-soft": "linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)",
        "sidebar-active": "linear-gradient(135deg, #FBBF24 0%, #F5A623 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
