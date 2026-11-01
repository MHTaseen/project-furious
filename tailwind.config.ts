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
        matte: {
          black: "#0B0B0C",
          surface: "#121214",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#FCF6BA",
          dark: "#AA771C",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "sans-serif"],
        brand: ["var(--font-space-grotesk)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

