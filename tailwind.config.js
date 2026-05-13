/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E7D32',
          dark: '#1B5E20',
          light: '#66BB6A',
          bg: '#E8F5E9',
        },
        earth: {
          DEFAULT: '#5D4037',
          dark: '#3E2723',
          light: '#8D6E63',
        },
        water: {
          DEFAULT: '#0277BD',
          light: '#4FC3F7',
        },
        ok: {
          DEFAULT: '#4CAF50',
          bg: '#E8F5E9',
        },
        warning: {
          DEFAULT: '#FFA726',
          dark: '#F57C00',
          bg: '#FFF3E0',
        },
        alert: {
          DEFAULT: '#EF5350',
          dark: '#C62828',
          bg: '#FFEBEE',
        },
        inactive: '#9E9E9E',
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E0E0E0',
          400: '#9E9E9E',
          600: '#616161',
          900: '#212121',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['32px', { fontWeight: '500', lineHeight: '1.2' }],
        h1: ['24px', { fontWeight: '500', lineHeight: '1.3' }],
        h2: ['18px', { fontWeight: '500', lineHeight: '1.4' }],
        body: ['14px', { fontWeight: '400', lineHeight: '1.5' }],
        caption: ['12px', { fontWeight: '400', lineHeight: '1.4' }],
        button: ['14px', { fontWeight: '500', lineHeight: '1' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        floating: '0 10px 25px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.05)',
        modal: '0 25px 50px rgba(0,0,0,0.20)',
      },
      borderRadius: {
        input: '8px',
        card: '12px',
        modal: '16px',
      },
    },
  },
  plugins: [],
}
