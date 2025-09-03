/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Family-friendly color palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        accent: {
          warm: '#f59e0b',
          'warm-light': '#fbbf24',
          'warm-dark': '#d97706',
          cool: '#06b6d4',
          'cool-light': '#22d3ee',
          'cool-dark': '#0891b2',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Open Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
        'xs': '0.75rem',   // 12px
        'sm': '0.875rem',  // 14px
        'base': '1rem',    // 16px
        'lg': '1.125rem',  // 18px
        'xl': '1.25rem',   // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
      },
      borderRadius: {
        'xl': '1rem',     // 16px
        '2xl': '1.5rem',  // 24px
        '3xl': '2rem',    // 32px
      },
      boxShadow: {
        'xs': '0 1px 1px 0 rgba(0, 0, 0, 0.05)',
        'primary': '0 10px 25px -5px rgba(59, 130, 246, 0.15)',
        'secondary': '0 10px 25px -5px rgba(168, 85, 247, 0.15)',
        'warm': '0 10px 25px -5px rgba(245, 158, 11, 0.15)',
        'success': '0 10px 25px -5px rgba(34, 197, 94, 0.15)',
        'error': '0 10px 25px -5px rgba(239, 68, 68, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0, 0, 0.2, 1)',
        'bounce-gentle': 'bounceGentle 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-gentle': 'pulseGentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out',
        'loading': 'loading 1.5s ease-in-out infinite',
        'checkmark': 'checkmark 0.3s cubic-bezier(0, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        wiggle: {
          '0%, 7%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(-3deg)' },
          '20%': { transform: 'rotate(2deg)' },
          '25%': { transform: 'rotate(-2deg)' },
          '30%': { transform: 'rotate(1deg)' },
          '35%': { transform: 'rotate(-1deg)' },
          '40%, 100%': { transform: 'rotate(0deg)' },
        },
        loading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        checkmark: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
    },
  },
  plugins: [
    // Add forms plugin for better form styling
    function({ addUtilities }) {
      const newUtilities = {
        '.text-gradient': {
          'background': 'linear-gradient(135deg, theme(colors.primary.600), theme(colors.secondary.600))',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.gradient-primary': {
          'background': 'linear-gradient(135deg, theme(colors.primary.500), theme(colors.primary.700))',
        },
        '.gradient-secondary': {
          'background': 'linear-gradient(135deg, theme(colors.secondary.500), theme(colors.secondary.700))',
        },
        '.gradient-warm': {
          'background': 'linear-gradient(135deg, theme(colors.accent.warm), theme(colors.accent.warm-dark))',
        },
        '.gradient-rainbow': {
          'background': 'linear-gradient(135deg, theme(colors.primary.500), theme(colors.secondary.500), theme(colors.accent.warm))',
        },
        '.btn-hover-lift': {
          'transition': 'all 0.25s cubic-bezier(0, 0, 0.2, 1)',
          '&:hover': {
            'transform': 'translateY(-2px)',
            'box-shadow': theme('boxShadow.lg'),
          },
          '&:active': {
            'transform': 'translateY(0)',
          },
        },
        '.card-hover': {
          'transition': 'all 0.25s cubic-bezier(0, 0, 0.2, 1)',
          '&:hover': {
            'transform': 'translateY(-2px)',
            'box-shadow': theme('boxShadow.lg'),
          },
        },
      }
      addUtilities(newUtilities)
    }
  ],
}