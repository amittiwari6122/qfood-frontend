import { motion, useReducedMotion } from 'framer-motion';
const FOODS = ['🍎', '🥖', '🍚', '🥕', '🍲', '🥛', '🍞', '🥗', '🍌', '🫓'];
export default function FoodParticles({ count = 14 }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.span key={i} className="absolute select-none text-2xl opacity-30"
          style={{ left: `${(i * 73) % 100}%`, top: '105%' }}
          animate={{ y: ['0vh', '-120vh'], rotate: [0, (i % 2 ? 1 : -1) * 120] }}
          transition={{ duration: 18 + (i % 5) * 4, repeat: Infinity, delay: i * 1.3, ease: 'linear' }}>{FOODS[i % FOODS.length]}</motion.span>
      ))}
    </div>
  );
}
