import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: { brand: { DEFAULT: "#2563eb", foreground: "#ffffff" } },
      borderRadius: { xl: "0.75rem", "2xl": "1rem" },
      boxShadow: { card: "0 6px 30px rgba(0,0,0,0.06)" }
    },
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
} satisfies Config
