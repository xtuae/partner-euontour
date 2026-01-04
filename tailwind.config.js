/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/features/**/*.{js,ts,jsx,tsx}",
    "./ui-html/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#B11226',
          black: '#1A1A1A',
          dark: '#4B4B4B',
          gray: '#E5E7EB',
          light: '#F5F5F5',
          hover: '#8E0E1E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

