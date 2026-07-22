import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border-color': 'var(--border-color)',
        'accent-color': 'var(--accent-color)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        popover: 'var(--popover)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        destructive: 'var(--destructive)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
    },
  },
  plugins: [],
}

export default config
