/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5A2EBB",
        secondary: "#2E3649",
        accent: "#F06292",
        success: "#32E875",
        warning: "#FFA726"
      }
    }
  },
  plugins: []
}
