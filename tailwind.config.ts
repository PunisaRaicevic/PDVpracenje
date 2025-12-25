import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SERVICEX Brand Colors - Modern Blue Theme
        // Steel blue backgrounds (similar to Zoho Books)
        steel: {
          50: '#f0f5f7',
          100: '#dce7ec',
          200: '#b9cfd9',
          300: '#96b7c6',
          400: '#739fb3',
          500: '#5B8BA0', // Main steel blue
          600: '#4A7C91',
          700: '#3A6274',
          800: '#2A4857',
          900: '#1A2E3A',
          950: '#0D171D',
        },
        // Accent blue for highlights
        accent: {
          50: '#e6f4f8',
          100: '#cce9f1',
          200: '#99d3e3',
          300: '#66bdd5',
          400: '#33a7c7',
          500: '#2E86AB', // Primary accent blue
          600: '#256D8C',
          700: '#1E5F7A',
          800: '#174A5E',
          900: '#103542',
        },
        // Navy for dark text
        navy: {
          50: '#e8eef3',
          100: '#c5d5e3',
          200: '#9fb9d0',
          300: '#799dbd',
          400: '#5c81aa',
          500: '#3f6597',
          600: '#335280',
          700: '#283f66',
          800: '#1E3A5F', // Dark text color
          900: '#142840',
          950: '#0a1420',
        },
        // Keep teal for backward compatibility
        teal: {
          50: '#e6f4f8',
          100: '#cce9f1',
          200: '#99d3e3',
          300: '#66bdd5',
          400: '#33a7c7',
          500: '#2E86AB',
          600: '#256D8C',
          700: '#1E5F7A',
          800: '#174A5E',
          900: '#103542',
        },
        // Keep lime/secondary for backward compatibility
        lime: {
          50: '#e6f4f8',
          100: '#cce9f1',
          200: '#99d3e3',
          300: '#66bdd5',
          400: '#5B8BA0',
          500: '#4A7C91',
          600: '#3A6274',
          700: '#2A4857',
          800: '#1A2E3A',
          900: '#0D171D',
        },
        // Primary mapped to accent blue
        primary: {
          50: '#e6f4f8',
          100: '#cce9f1',
          200: '#99d3e3',
          300: '#66bdd5',
          400: '#33a7c7',
          500: '#2E86AB',
          600: '#256D8C',
          700: '#1E5F7A',
          800: '#174A5E',
          900: '#103542',
        },
        // Secondary mapped to steel
        secondary: {
          50: '#f0f5f7',
          100: '#dce7ec',
          200: '#b9cfd9',
          300: '#96b7c6',
          400: '#739fb3',
          500: '#5B8BA0',
          600: '#4A7C91',
          700: '#3A6274',
          800: '#2A4857',
          900: '#1A2E3A',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-servicex': 'linear-gradient(135deg, #5B8BA0 0%, #4A7C91 50%, #5B8BA0 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(46, 134, 171, 0.3)',
        'glow-steel': '0 0 20px rgba(91, 139, 160, 0.3)',
        'glow-teal': '0 0 20px rgba(46, 134, 171, 0.3)',
        'glow-lime': '0 0 20px rgba(91, 139, 160, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config
