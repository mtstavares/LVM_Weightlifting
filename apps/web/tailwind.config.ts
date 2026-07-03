import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        'surface-raised': 'hsl(var(--surface-raised))',
        'surface-hover': 'hsl(var(--surface-hover))',
        sidebar: 'hsl(var(--sidebar))',
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        disabled: 'hsl(var(--disabled))',
        primary: 'hsl(var(--primary))',
        accent: 'hsl(var(--accent))',
        danger: 'hsl(var(--danger))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        info: 'hsl(var(--info))'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      boxShadow: {
        premium: '0 24px 80px rgba(0, 0, 0, 0.35)',
        glow: '0 0 0 1px rgba(212, 175, 55, 0.18), 0 24px 80px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
