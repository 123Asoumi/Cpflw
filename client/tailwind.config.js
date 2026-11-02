/** Centralized design tokens — CampusFlow brand + Notion-inspired neutrals. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#315EFB', // Campus Blue
          hover: '#2449D8',
          ink: '#172033', // Midnight Ink
          canvas: '#F6F7F5', // Soft Canvas
          sky: '#DCE7FF',
        },
        ink: {
          DEFAULT: '#37352F', // primary text
          soft: '#787774', // secondary text
          muted: '#A4A4A0', // muted text
        },
        line: '#E9E9E7', // borders
        side: '#F7F7F5', // sidebar
        hover: '#F1F1EF', // hover background
        success: { DEFAULT: '#16845B', soft: '#E3F3EC' },
        warning: { DEFAULT: '#E99A32', soft: '#FBF0E1' },
        danger: { DEFAULT: '#D94C4C', soft: '#FBE9E9' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['15px', '24px'],
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        pop: '0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1), 0 9px 24px rgba(15,15,15,0.2)',
        soft: '0 1px 2px rgba(15,15,15,0.04)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(4px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'pop-in': 'pop-in .15s ease-out',
        'slide-in': 'slide-in .2s ease-out',
      },
    },
  },
  plugins: [],
};
