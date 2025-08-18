/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './pages/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E90FF',
        success: '#00C49A',
        danger: '#FF4C4C',
        deep: '#0B1F3A',
        card: '#F7F9FC',
        muted: '#708090',
        grid: '#E2E8F0',
      },
      fontFamily: {
        heading: ['var(--font-poppins)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
