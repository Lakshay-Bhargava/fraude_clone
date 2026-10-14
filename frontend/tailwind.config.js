/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          primary: '#D4AF37',
          deep: '#A67C00',
          pale: '#F5EAC2',
          light: '#FBF7EA',
          border: '#E8DDB8',
        },
        surface: {
          primary: '#FFFFFF',
          secondary: '#FAF9F6',
          ivory: '#FFFDF7',
          elevated: '#FFFFFF',
          input: '#FFFFFF',
        },
        typography: {
          main: '#202124',
          secondary: '#697386',
          muted: '#8C97A8',
        },
        status: {
          success: '#23865B',
          'success-bg': 'rgba(35, 134, 91, 0.08)',
          warning: '#C47B16',
          'warning-bg': 'rgba(196, 123, 22, 0.08)',
          danger: '#C83D4D',
          'danger-bg': 'rgba(200, 61, 77, 0.08)',
        },
        // Compatibility aliases for existing components
        bg: {
          main: '#FAF9F6',
          secondary: '#FFFDF7',
          sidebar: '#FFFDF7',
          DEFAULT: '#FFFFFF',
        },
        background: {
          DEFAULT: '#FAF9F6',
          main: '#FAF9F6',
          secondary: '#FFFFFF',
          sidebar: '#FFFDF7',
          elevated: '#FFFFFF',
          surface: '#FFFDF7',
        },
        card: {
          DEFAULT: '#FFFDF7',
          main: '#FFFDF7',
          elevated: '#FFFFFF',
          input: '#FFFFFF',
        },
        brand: {
          primary: '#A67C00',
          hover: '#8C6700',
          glow: 'rgba(212, 175, 55, 0.25)',
          dim: 'rgba(212, 175, 55, 0.1)',
        },
        risk: {
          high: '#C83D4D',
          'high-bg': 'rgba(200, 61, 77, 0.08)',
          medium: '#C47B16',
          'medium-bg': 'rgba(196, 123, 22, 0.08)',
          low: '#23865B',
          'low-bg': 'rgba(35, 134, 91, 0.08)',
          info: '#A67C00',
        },
        border: {
          subtle: '#E8DDB8',
          focus: '#D4AF37',
        },
        text: {
          primary: '#202124',
          secondary: '#697386',
          muted: '#8C97A8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Outfit', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'gold-sm': '0 1px 3px rgba(166, 124, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'gold-md': '0 4px 14px -2px rgba(166, 124, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        'gold-lg': '0 10px 25px -4px rgba(166, 124, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'card-subtle': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
}
