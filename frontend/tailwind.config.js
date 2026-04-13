/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green:  "#1a472a",
          gold:   "#c8963e",
          ink:    "#0a0a0f",
          paper:  "#f5f3ef",
          muted:  "#6b6b6b",
          border: "#d4d0c8",
          blue:   "#1e3a5f",
          red:    "#c0392b",
        },
      },
    },
  },
  plugins: [],
};

