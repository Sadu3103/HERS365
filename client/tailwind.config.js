/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          50:  '#fff2ee',
          100: '#ffd9cc',
          200: '#ffb399',
          300: '#ff8c66',
          400: '#ff6633',
          500: '#ff5a2d',
          600: '#e64a1f',
          700: '#cc3a12',
          800: '#992b0d',
          900: '#661c08',
        },
        surface: {
          DEFAULT: '#111111',
          card:    '#161616',
          hover:   '#1c1c1c',
          border:  'rgba(255,255,255,0.06)',
        },
        ink: {
          DEFAULT: '#ffffff',
          muted:   '#999999',
          faint:   '#555555',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'slide-down':'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { '0%': { transform: 'translateY(-12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
