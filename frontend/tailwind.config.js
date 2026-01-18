/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: 'var(--theme-bgPrimary, #0a0a0a)',
          800: 'var(--theme-bgSecondary, #111111)',
          700: 'var(--theme-bgCard, #1a1a1a)',
          600: 'var(--theme-bgHover, #222222)',
          500: '#2a2a2a',
        },
        accent: {
          green: 'var(--theme-primary, #00d4aa)',
          orange: 'var(--theme-accent, #ff6b35)',
        },
        theme: {
          primary: 'var(--theme-primary, #3B82F6)',
          secondary: 'var(--theme-secondary, #10B981)',
          accent: 'var(--theme-accent, #F59E0B)',
          success: 'var(--theme-success, #10B981)',
          error: 'var(--theme-error, #EF4444)',
          warning: 'var(--theme-warning, #F59E0B)',
          buy: 'var(--theme-buyColor, #3B82F6)',
          sell: 'var(--theme-sellColor, #EF4444)',
          profit: 'var(--theme-profitColor, #10B981)',
          loss: 'var(--theme-lossColor, #EF4444)',
        }
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
