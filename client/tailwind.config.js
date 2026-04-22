/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f0f0f',
        card: '#1a1a1a',
        border: '#2a2a2a',
      },
    },
  },
  plugins: [],
};
