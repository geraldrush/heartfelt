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
          500: '#f26a6a',
        },
        peach: {
          400: '#f7b48b',
        },
        'sunset-orange': '#f97316',
      },
      backgroundImage: {
        'romantic-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'sunset-gradient': 'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
        'warm-glow': 'radial-gradient(circle at top, #ffd6d6 0%, #fff1e6 45%, #ffffff 100%)',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
        sparkle: {
          '0%': { transform: 'rotate(0deg) scale(0)', opacity: 0 },
          '50%': { transform: 'rotate(180deg) scale(1)', opacity: 1 },
          '100%': { transform: 'rotate(360deg) scale(0)', opacity: 0 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 0.8s ease-in-out infinite',
        sparkle: 'sparkle 0.6s ease-in-out',
        float: 'float 3s ease-in-out infinite',
        slideUp: 'slideUp 0.3s ease-in-out',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}
