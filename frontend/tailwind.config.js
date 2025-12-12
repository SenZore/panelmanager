/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0c0c0f',
          800: '#18181e',
          700: '#1f1f28',
          600: '#27272f',
          500: '#3f3f46',
        },
        accent: {
          500: '#6366f1',
          600: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
