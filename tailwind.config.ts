import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        brand: {
          DEFAULT: '#0a1121',
          light: '#1e293b',
          dark: '#060a14'
        },
        accent: {
          DEFAULT: '#14B8A6',
          light: '#5eead4',
          dark: '#0d9488'
        }
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          lg: '1120px',
          xl: '1400px',
          '2xl': '1600px'
        }
      }
    }
  },
  plugins: [
    // @ts-expect-error - CommonJS require in TS config
    require('@tailwindcss/forms'),
    // @ts-expect-error
    require('@tailwindcss/typography'),
    // @ts-expect-error
    require('@tailwindcss/line-clamp'),
    // aspect-ratio plugin omitted for now due to npm availability issues
  ]
}

export default config 