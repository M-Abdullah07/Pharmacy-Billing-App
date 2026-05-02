export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem', // softer, more modern
        md: '0.625rem',
        sm: '0.5rem',
      },
      boxShadow: {
        soft: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        card: '0 4px 20px -2px rgb(16 185 129 / 0.08)',
      },
    },
  },
  plugins: [],
};
