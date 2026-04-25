/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Use 95% black across the app instead of pitch black for a softer feel.
        black: "#0d0d0d"
      }
    }
  },
  plugins: []
};
