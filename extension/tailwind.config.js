/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#3358f4', 600: '#2645d6', 700: '#1e37ab' },
      },
    },
  },
  plugins: [],
};
