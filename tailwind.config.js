/** Colour carries meaning: sky = UI, emerald = safe/done, amber = expiring,
 *  rose = critical, violet/cyan = AI & quantum. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: '#0F2A4A', soft: '#3B5574', faint: '#7A90AA' },
        sky: { 50: '#F0F8FF', 100: '#E0F1FE', 200: '#BAE3FD', 300: '#7DCDFB', 400: '#38B2F6', 500: '#0E98E6', 600: '#0279C4', 700: '#03619F', 800: '#075283', 900: '#0C446D' },
        deep: '#0A2E5C',
        quantum: { cyan: '#22D3EE', violet: '#8B5CF6', glow: '#C4B5FD', night: '#0B1530' },
      },
      boxShadow: { soft: '0 8px 30px -12px rgba(14,152,230,.25)', lift: '0 18px 50px -20px rgba(10,46,92,.35)' },
      backgroundImage: { 'sky-wash': 'radial-gradient(1200px 600px at 10% -10%, #E0F1FE 0%, transparent 60%), radial-gradient(900px 500px at 110% 10%, #EDE9FE 0%, transparent 55%)' },
      keyframes: {
        scan: { '0%': { top: '0%' }, '100%': { top: '100%' } },
        pulseRing: { '0%': { transform: 'scale(.8)', opacity: '.8' }, '100%': { transform: 'scale(1.45)', opacity: '0' } },
        dash: { to: { strokeDashoffset: '-24' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        ring: { '0%,100%': { transform: 'rotate(0)' }, '20%': { transform: 'rotate(14deg)' }, '40%': { transform: 'rotate(-12deg)' }, '60%': { transform: 'rotate(8deg)' } },
      },
      animation: { scan: 'scan 1.8s ease-in-out infinite alternate', pulseRing: 'pulseRing 1.8s ease-out infinite', dash: 'dash 1s linear infinite', floaty: 'floaty 5s ease-in-out infinite', ring: 'ring .9s ease-in-out' },
    },
  },
  plugins: [],
};
