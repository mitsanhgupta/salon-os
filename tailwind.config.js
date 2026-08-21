/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Base surfaces */
        bg: "#FAFAFA",
        surface: "#FFFFFF",
        "surface-alt": "#F4F3F1",
        border: "#EAE9E7",

        /* Text */
        "text-primary": "#171717",
        "text-secondary": "#6B6B6B",
        "text-tertiary": "#9C9C9C",

        /* Accent — salon warmth (BookMyShow-style boldness) */
        accent: "#E8492D",
        "accent-hover": "#D13F25",
        "accent-soft": "#FDEDE9",

        /* Semantic */
        success: "#1E8E5A",
        "success-soft": "#E6F4EC",
        warning: "#B8790A",
        "warning-soft": "#FBF1DE",
        danger: "#D3372C",
        "danger-soft": "#FBEAE8",

        /* Role accents (dashboards) */
        "role-customer": "#5B9DFF",
        "role-receptionist": "#2E7D6B",
        "role-owner": "#E8492D",
        "role-manager": "#8B5CF6",
      },

      fontFamily: {
        display: ["Inter Tight", "Inter", "-apple-system", "Segoe UI", "sans-serif"],
        body: ["Inter", "-apple-system", "Segoe UI", "sans-serif"],
      },

      fontSize: {
        "text-hero": ["clamp(2.5rem, 5.2vw, 4.5rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "text-h1": ["clamp(1.625rem, 2.6vw, 2.25rem)", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "text-h2": ["clamp(1.25rem, 1.9vw, 1.625rem)", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "text-h3": ["1.0625rem", { lineHeight: "1.3" }],
        "text-body": ["0.875rem", { lineHeight: "1.55" }],
        "text-caption": ["0.71875rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },

      borderRadius: {
        card: "16px",
        md: "12px",
        sm: "8px",
        full: "9999px",
        sheet: "24px 24px 0 0",
      },

      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
        sticky: "0 -4px 16px rgba(0,0,0,0.08)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
      },

      spacing: {
        "topbar-h": "60px",
        "bottomnav-h": "64px",
        gutter: "16px",
        "gutter-wide": "26px",
      },

      transitionTimingFunction: {
        "ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      animation: {
        "fade-up": "fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
      },

      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};