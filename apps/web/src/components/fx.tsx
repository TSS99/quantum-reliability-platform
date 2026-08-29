import { useEffect, useRef, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from 'framer-motion';

/**
 * The motion layer.
 *
 * One rule decides where each of these may be used, and it is the same rule the design system
 * already follows: DECORATIVE motion belongs to the marketing surface, DATA-DRIVEN motion belongs
 * to the application. A chart that draws itself as the numbers arrive is telling you something. A
 * card that tilts under the cursor on a results page is not, and it competes with the data.
 *
 * Everything here honours `prefers-reduced-motion` — not by shortening durations, but by removing
 * the movement and going straight to the final state. Reduced motion is an accessibility setting,
 * not a taste setting.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/* --------------------------------------------------------------------- reveal */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.965 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.66, ease: EASE_OUT } },
};

/** Parent that releases its children in sequence. */
export function stagger(step = 0.07, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
  };
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  /** Stagger children instead of animating as one block. */
  stagger?: number;
  delay?: number;
  /** Fire once on entry (default) or every time it scrolls back into view. */
  once?: boolean;
  amount?: number;
}

/** Animate a block when it scrolls into view. The workhorse for the landing page. */
export function Reveal({
  children,
  className = '',
  variants = fadeUp,
  stagger: step,
  delay = 0,
  once = true,
  amount = 0.25,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={step ? stagger(step, delay) : variants}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      transition={step ? undefined : { delay }}
    >
      {children}
    </motion.div>
  );
}

/** A child of a `Reveal` that staggers. */
export function RevealItem({
  children,
  className = '',
  variants = fadeUp,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------- parallax */

/**
 * Move an element against the scroll. `depth` is how far it drifts over one viewport — small
 * numbers only; parallax stops reading as depth and starts reading as lag past ~120px.
 */
export function useParallax(depth = 60) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const raw = useTransform(scrollY, [0, 900], [0, reduced ? 0 : depth]);
  return useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });
}

/** Scroll-linked opacity, for a hero that dissolves as the page moves under it. */
export function useScrollFade(from = 240, to = 620) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  return useTransform(scrollY, [from, to], [1, reduced ? 1 : 0.15]);
}

/* ------------------------------------------------------------------- progress */

/** A hairline progress bar for the top of a long page. */
export function ScrollProgress({ className = '' }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className={
        'pointer-events-none fixed inset-x-0 top-0 z-50 h-px bg-series-mitigated ' + className
      }
    />
  );
}

/* -------------------------------------------------------------------- numbers */

/**
 * Count a number up when it enters view.
 *
 * Used for real quantities, so it formats rather than just printing: a metric that animates but
 * lands on an unreadable float is worse than one that does not animate.
 */
export function AnimatedNumber({
  to,
  decimals = 0,
  suffix = '',
  prefix = '',
  duration = 1.1,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const value = useMotionValue(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(value, to, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, to, duration, reduced, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number) => {
      el.textContent = prefix + v.toFixed(decimals) + suffix;
    };
    write(value.get());
    return value.on('change', write);
  }, [value, decimals, suffix, prefix]);

  return <span ref={ref} />;
}

/* ------------------------------------------------------------------ magnetic */

/**
 * A control that leans toward the cursor. Marketing only — in the app this would be interaction
 * carrying no meaning, which the design system rules out.
 */
export function Magnetic({
  children,
  strength = 0.28,
  className = '',
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ svg draw */

/**
 * Draw an SVG path as if it were being plotted.
 *
 * This is the one animation that is welcome inside the application: a curve that draws itself is
 * showing the reader the shape of the data in the order the data has, and it finishes in exactly
 * the state a static render would have produced.
 */
type MotionPathProps = React.ComponentProps<typeof motion.path>;

export function DrawPath({
  d,
  duration = 1.1,
  delay = 0,
  ...rest
}: { d: string; duration?: number; delay?: number } & Omit<
  MotionPathProps,
  'd' | 'initial' | 'animate' | 'transition'
>) {
  const reduced = useReducedMotion();
  return (
    <motion.path
      d={d}
      initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: reduced ? 0 : duration, delay: reduced ? 0 : delay, ease: EASE_OUT }}
      {...rest}
    />
  );
}

/** A data point that pops in after its curve has been drawn. */
export function PopIn({
  delay = 0,
  children,
}: {
  delay?: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.g
      initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : delay, ease: EASE_OUT }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.g>
  );
}

/* ------------------------------------------------------------------ spotlight */

/** A soft light that follows the cursor across a surface. Marketing only. */
export function Spotlight({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className={'pointer-events-none absolute inset-0 overflow-hidden ' + className}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      style={{
        background:
          'radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), rgb(var(--glow-cyan) / 0.10), transparent 70%)',
        transition: 'background 120ms linear',
      }}
    />
  );
}
