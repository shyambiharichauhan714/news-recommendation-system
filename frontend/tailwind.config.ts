import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A0E1F",
          900: "#0D1226",
          850: "#111631",
          800: "#151B3B",
          700: "#1D2448",
        },
        brand: {
          50: "#F0F4FF",
          100: "#E0E9FF",
          200: "#C2D3FF",
          300: "#9AB4FF",
          400: "#6E8BFF",
          500: "#4A63FA",
          600: "#3B47E8",
          700: "#3138C4",
          800: "#292F9C",
          900: "#252A78",
        },
        violet: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        surface: {
          DEFAULT: "#F6F7FB",
          card: "#FFFFFF",
          border: "#E7E9F3",
          muted: "#F0F1F8",
        },
        ink: {
          900: "#0F1229",
          700: "#33395B",
          500: "#666C93",
          400: "#8A8FB0",
          300: "#B5B9D4",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #4A63FA 0%, #8B5CF6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(74,99,250,0.12) 0%, rgba(139,92,246,0.12) 100%)",
        // Deep indigo-violet — picks up the brand gradient's hue instead of
        // the old near-black navy, so the dark surfaces read as designed
        // rather than as "unstyled black".
        "navy-gradient": "linear-gradient(180deg, #241E63 0%, #171243 100%)",
        // Light hero panel — near-white on the left so headline copy stays
        // high-contrast, drifting to lavender under the illustration.
        "hero-gradient":
          "linear-gradient(105deg, #FBFAFF 0%, #F3F0FF 45%, #E9E3FF 100%)",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(15, 18, 41, 0.04), 0 1px 2px rgba(15, 18, 41, 0.03)",
        card: "0 4px 24px rgba(15, 18, 41, 0.06)",
        "card-hover": "0 8px 32px rgba(15, 18, 41, 0.10)",
        glow: "0 0 0 1px rgba(74,99,250,0.15), 0 8px 24px rgba(74,99,250,0.20)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [],
};

export default config;
