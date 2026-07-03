/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Adnova-ish palette
        brand: { DEFAULT: '#16a34a', dark: '#15803d' }, // the green Next buttons
        ink: '#0f172a',
        sidebar: '#fafafa',
      },
    },
  },
  plugins: [],
};
