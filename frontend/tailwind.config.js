/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B1220',
          secondary: '#0E1728',
          sidebar: '#091426',
          DEFAULT: '#0B1220',
        },
        background: {
          DEFAULT: '#0B1220',
          main: '#0B1220',
          secondary: '#0E1728',
          sidebar: '#091426',
          elevated: '#18243A',
          surface: '#131C2E',
        },
        card: {
          DEFAULT: '#131C2E',
          main: '#131C2E',
          elevated: '#18243A',
          input: '#0D182B',
        },
        brand: {
          primary: '#6366F1',
          hover: '#818CF8',
          glow: 'rgba(99, 102, 241, 0.25)',
          dim: 'rgba(99, 102, 241, 0.15)',
        },
        cyan: {
          accent: '#22D3EE',
          dim: 'rgba(34, 211, 238, 0.15)',
        },
        risk: {
          high: '#EF4444',
          'high-bg': 'rgba(239, 68, 68, 0.12)',
          medium: '#F59E0B',
          'medium-bg': 'rgba(245, 158, 11, 0.12)',
          low: '#10B981',
          'low-bg': 'rgba(16, 185, 129, 0.12)',
          info: '#38BDF8',
        },
        border: {
          subtle: 'rgba(148, 163, 184, 0.15)',
          focus: 'rgba(99, 102, 241, 0.4)',
        },
        text: {
          primary: '#E5E9F2',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          cyan: '#22D3EE',
          indigo: '#6366F1',
          sky: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'scanner-beam': 'scannerBeam 3s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-in-right': 'slideInRight 0.25s ease-out forwards',
      },
      keyframes: {
        scannerBeam: {
          '0%, 100%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { transform: 'translateY(100%)', opacity: '0.8' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
