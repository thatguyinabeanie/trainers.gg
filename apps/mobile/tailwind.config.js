const { mobileTheme } = require("@trainers/theme/mobile");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      ...mobileTheme,
      // Mobile-specific font family (uses system fonts)
      fontFamily: {
        sans: ["Inter", "System"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
