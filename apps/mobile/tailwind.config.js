const { sharedTheme } = require("@trainers/theme/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      ...sharedTheme,
      // Mobile-specific font family (uses system fonts)
      fontFamily: {
        sans: ["Noto Sans", "System"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};
