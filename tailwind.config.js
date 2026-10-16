/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adas: {
          green: "#10B981",
          orange: "#F59E0B",
          red: "#EF4444",
          blue: "#3B82F6",
          cyan: "#06B6D4"
        }
      },
      fontFamily: {
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-fast': 'pulse 0.75s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'glow-pulse': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 16px rgba(239, 68, 68, 0.9))' }
        }
      }
    },
  },
  plugins: [],
}
