/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wasteland: {
          950: '#08090a',
          900: '#111315',
          850: '#181b1e',
          800: '#212529',
          700: '#343a40',
          600: '#495057',
          500: '#6c757d',
          400: '#adb5bd',
          300: '#ced4da',
          200: '#e9ecef',
          100: '#f8f9fa',
        },
        beacon: {
          amber: '#f59e0b',
          glow: '#fbbf24',
          dim: '#b45309',
        },
        hazard: {
          red: '#ef4444',
          crimson: '#dc2626',
          dark: '#991b1b',
        },
        safe: {
          green: '#10b981',
          emerald: '#059669',
        }
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace', 'ui-monospace'],
      }
    },
  },
  plugins: [],
}
