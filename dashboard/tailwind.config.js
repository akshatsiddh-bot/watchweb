/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#dbe6fe',
          500: '#3358f4',
          600: '#2645d6',
          700: '#1e37ab',
        },
      },
    },
  },
  plugins: [],
};
