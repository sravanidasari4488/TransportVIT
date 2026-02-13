/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light theme colors
        light: {
          background: '#F8FAFC',
          surface: '#FFFFFF',
          text: '#1E293B',
          textSecondary: '#64748B',
          primary: '#3366FF',
          border: '#E2E8F0',
          card: '#FFFFFF',
        },
        // Dark theme colors
        dark: {
          background: '#00050d',
          surface: '#1E293B',
          text: '#F8FAFC',
          textSecondary: '#CBD5E1',
          primary: '#60A5FA',
          border: '#475569',
          card: '#1E293B',
        }
      },
      fontFamily: {
        'inter': ['Inter'],
      },
    },
  },
  plugins: [],
}