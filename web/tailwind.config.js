/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: 'var(--primary)', dark: 'var(--primary-hover)' },
        bg: 'var(--bg)',
        rail: 'var(--rail)',
        side: 'var(--side)',
        surface: 'var(--surface)',
        line: 'var(--border)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        primary: 'var(--primary)',
        input: 'var(--input)',
        hover: 'var(--hover)',
      },
    },
  },
  plugins: [],
};
