'use client';
import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

// One entrance timeline per screen. Elements are only animated if present, and nothing runs for reduced motion.
export function useSceneIntro(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      // clearProps hands control back to the stylesheet afterwards, so a menu that was closed can never get stuck invisible.
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'opacity,transform' } });
      tl.from('.navbar > *', { opacity: 0, y: -12, duration: 0.7, stagger: 0.08 })
        .from('.explore:not(.closed)', { opacity: 0, x: -24, duration: 0.8 }, '<0.1')
        .from('.explore:not(.closed) li', { opacity: 0, x: -16, duration: 0.5, stagger: 0.07 }, '<0.2')
        .from('.panel, .tourbar', { opacity: 0, y: 20, duration: 0.7 }, '<0.1')
        .from('.controls .ctl', { opacity: 0, y: 10, duration: 0.4, stagger: 0.06 }, '<0.2')
        .from('.drag-hint, .radar', { opacity: 0, duration: 0.6 }, '<');
    }, el);
    return () => ctx.revert();
  }, [scope]);
}

// Homescreen: the black artwork slides in from the right, then logos and text lines fade in left -> right, line by line.
export function useHomeIntro(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-bg', { xPercent: 14, opacity: 0, duration: 1.1 })
        .from('.navbar > *', { opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.6')
        .from('[data-reveal]', { opacity: 0, x: -48, duration: 0.5, stagger: 0.12 }, '-=0.3');
    }, el);
    return () => ctx.revert();
  }, [scope]);
}
