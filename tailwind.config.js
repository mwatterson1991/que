/** @type {import('tailwindcss').Config} */
// Mirrors lib/tokens.ts for NativeWind classes. Change both together.
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        raised: "#111113",
        surface: "#151517",
        accent: "#E4A853",
        ink: "#ECECEE",
        "ink-2": "#9A9AA1",
        "ink-3": "#606067",
        danger: "#E5533D",
      },
    },
  },
  plugins: [],
};
