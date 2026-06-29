/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent)',
          active: 'var(--color-accent)',
          light: 'var(--color-accent)',
          muted: 'var(--color-accent-muted)',
        },
        surface: {
          50: 'var(--color-bg)',
          100: 'var(--color-surface-hover)',
          200: 'var(--color-border)',
          300: 'var(--color-border)',
          400: 'var(--color-text-muted)',
          500: 'var(--color-text-muted)',
          600: 'var(--color-text-muted)',
          700: 'var(--color-border)',
          800: 'var(--color-surface-hover)',
          900: 'var(--color-text)',
          950: 'var(--color-bg)',
        },
        destructive: 'var(--color-text)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
