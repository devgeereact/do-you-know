import type { Config } from 'tailwindcss';

// Design tokens mirror docs/03-design/DESIGN-SYSTEM.md. Every colour is a CSS variable (RGB
// channels) defined in src/index.css for light (:root) and dark (.dark), so one
// class name works in both themes. Keep class names NativeWind-compatible.
const token = (name: string): string => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('background'), // page: mist / deep ink
        surface: {
          DEFAULT: token('surface'), // cards, sheets
          border: token('surface-border'),
        },
        primary: {
          DEFAULT: token('primary'), // grape: buttons, links
          fg: token('primary-fg'), // text on primary
        },
        secondary: {
          DEFAULT: token('sun'), // sunshine yellow: accents, highlights
          fg: token('sun-fg'),
        },
        sky: token('sky'), // lagoon: info and illustration fills
        tang: { DEFAULT: token('tang'), fg: token('content') }, // tangerine: the play action
        gum: token('gum'), // bubblegum: celebrations only
        content: {
          DEFAULT: token('content'), // body text
          muted: token('content-muted'),
        },
        correct: { DEFAULT: token('correct'), fg: '#FFFFFF' },
        wrong: { DEFAULT: token('wrong'), fg: '#FFFFFF' },
        warning: { DEFAULT: token('warning'), fg: '#1B2A3A' },
        avatar: {
          fox: token('avatar-fox'),
          owl: token('avatar-owl'),
          panda: token('avatar-panda'),
          lion: token('avatar-lion'),
          frog: token('avatar-frog'),
          octopus: token('avatar-octopus'),
          penguin: token('avatar-penguin'),
          unicorn: token('avatar-unicorn'),
          dragon: token('avatar-dragon'),
          robot: token('avatar-robot'),
          rocket: token('avatar-rocket'),
          star: token('avatar-star'),
        },
      },
      fontFamily: {
        sans: ['"Outfit Variable"', 'Outfit', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Baloo 2 Variable"', '"Baloo 2"', '"Outfit Variable"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // 16px minimum body text for young readers
        base: ['1rem', { lineHeight: '1.6' }],
      },
      borderRadius: {
        xl: '1rem', // cards
        '2xl': '1.5rem', // cards, sheets, dialogs
        '3xl': '1.75rem', // feature cards
        frame: '2.5rem', // game frame
      },
      boxShadow: {
        // Chunky "game button" edge. The edge shrinks on press so the button sinks.
        'edge-primary': '0 4px 0 0 rgb(var(--primary-edge))',
        'edge-sun': '0 4px 0 0 rgb(var(--sun-edge))',
        'edge-tang': '0 4px 0 0 rgb(var(--tang-edge))',
        'edge-ink': '0 4px 0 0 rgb(var(--content))',
        'edge-surface': '0 4px 0 0 rgb(var(--surface-border))',
        'edge-pressed': '0 1px 0 0 rgb(var(--surface-border))',
        lift: '0 12px 32px -14px rgb(var(--content) / 0.30)',
        soft: '0 1px 2px rgb(var(--content) / 0.05)',
        float: '0 24px 48px -20px rgb(var(--content) / 0.38)',
      },
      minHeight: { tap: '3rem' }, // 48px touch targets
      minWidth: { tap: '3rem' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        countdown: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 300ms ease-out both',
        pop: 'pop 250ms ease-out',
        shake: 'shake 250ms ease-in-out',
        // Fills over the auto-advance delay (keep in step with AUTO_ADVANCE_MS in FeedbackPanel).
        countdown: 'countdown 2500ms linear forwards',
      },
    },
  },
  plugins: [],
};

export default config;
