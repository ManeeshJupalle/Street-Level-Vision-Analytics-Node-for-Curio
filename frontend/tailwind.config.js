/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f1729',
          800: '#141d2f',
          700: '#1a2332',
          600: '#1f2b3d',
          500: '#283548',
        },
        accent: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
          glow: 'rgba(59,130,246,0.15)',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(59,130,246,0.15)',
        'glow-lg': '0 0 30px rgba(59,130,246,0.2)',
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
