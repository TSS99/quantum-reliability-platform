import { useEffect, useRef, useState, type ReactNode } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- reveal */

/** Adds `.is-in` when the element scrolls into view, driving the CSS reveal. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (jsdom, older browsers) or reduced motion: show it immediately
    // rather than leaving content invisible — the reveal is an enhancement, not a gate.
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export interface RevealProps {
  children: ReactNode;
  /** direction/style of the entrance */
  as?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
  className?: string;
}

/** Wrapper that fades + slides its children in on scroll. */
export function Reveal({ children, as = 'up', delay = 0, className = '' }: RevealProps) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-reveal={as === 'up' ? '' : as}
      style={{ ['--d' as string]: `${delay}ms` }}
      className={className}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- tilt */

/** Pointer-driven 3D tilt + spotlight coordinates. Attach to a `.hx-tilt.hx-spot`. */
export function useTilt<T extends HTMLElement>(max = 8) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let frame = 0;
    const onMove = (ev: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max]);
  return ref;
}

/* ------------------------------------------------------------ count up */

/** Animates a number up when it enters view. Returns the display value. */
export function useCountUp(target: number, duration = 1200, decimals = 0) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [val, setVal] = useState(reduced() ? target : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      setVal(target);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          // easeOutExpo — fast start, soft landing
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          setVal(Number((target * eased).toFixed(decimals)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration, decimals]);
  return { ref, val };
}

export function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const { ref, val } = useCountUp(to, 1200, decimals);
  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* --------------------------------------------------------- kinetic text */

/** Per-character staggered entrance. Words stay unbroken for readability. */
export function KineticText({ text, className = '', startAt = 0 }: { text: string; className?: string; startAt?: number }) {
  let i = startAt;
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((word, wi, arr) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split('').map((ch, ci) => (
            <span key={ci} className="hx-char" style={{ ['--ci' as string]: i++ }} aria-hidden>
              {ch}
            </span>
          ))}
          {wi < arr.length - 1 && <span className="hx-char" style={{ ['--ci' as string]: i++ }} aria-hidden>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}
