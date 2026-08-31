/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bgDeep: '#04050F',
        bgPrimary: '#0A0B2E',
        bgElevated: '#0E1035',
        neon: '#AAFF00',
        neonHover: '#C8FF33',
        card: 'rgba(255,255,255,0.06)',
        danger: '#FF4D6A',
        warning: '#FFB800',
        info: '#6B8AFF',
      },
    },
  },
  plugins: [],
};
