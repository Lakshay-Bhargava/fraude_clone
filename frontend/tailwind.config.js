/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#08090D',
          main: '#08090D',
          secondary: '#101218',
          elevated: '#171A22',
          surface: '#1c1f2a',
        },
        brand: {
          primary: '#FF7547',
          hover: '#FF8A65',
          dim: 'rgba(255, 117, 71, 0.15)',
        },
        risk: {
          high: '#FF4D5A',
          'high-bg': 'rgba(255, 77, 90, 0.12)',
          medium: '#F3B84B',
          'medium-bg': 'rgba(243, 184, 75, 0.12)',
          low: '#49D6A5',
          'low-bg': 'rgba(73, 214, 165, 0.12)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.09)',
          focus: 'rgba(255, 117, 71, 0.4)',
        },
        text: {
          primary: '#F5F5F7',
          secondary: '#9297A4',
          muted: '#626775',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'scanner-beam': 'scannerBeam 3s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
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
        }
      }
    },
  },
  plugins: [],
}
