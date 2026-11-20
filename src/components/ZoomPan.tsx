'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canFullscreen, isIOS } from '@/lib/device';

const MIN = 1;
const MAX = 5;
const PINCH_GAIN = 2; // fingers move less than the image zooms, so one spread is enough
type T = { s: number; x: number; y: number };

// Pinch / wheel / double-tap / drag zoom for one child. Children get `--z` (current scale) so overlays can counter-scale.
// onBack (optional) adds a bottom-left Back button that stays reachable at any zoom level and in fullscreen.
export default function ZoomPan({ children, label = 'Zoom', onBack, backLabel = 'Back' }: { children: React.ReactNode; label?: string; onBack?: () => void; backLabel?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  const [canFs, setCanFs] = useState(false);
  const [t, setT] = useState<T>({ s: 1, x: 0, y: 0 });
  const [big, setBig] = useState(false); // full-screen look; stays on until the shrink-back animation has finished
  const rect = useRef<DOMRect | null>(null); // where the card sits on screen, taken just before it first zooms
  const anim = useRef<Animation[]>([]);
  const closing = useRef(false);
  const cur = useRef<T>({ s: 1, x: 0, y: 0 }); // what is drawn
  const tgt = useRef<T>({ s: 1, x: 0, y: 0 }); // where wheel / trackpad pinch / buttons are heading
  const raf = useRef(0);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ d: number; cx: number; cy: number } | null>(null);
  const moved = useRef(false);

  const clamp = useCallback((n: T): T => {
    const el = box.current;
    const s = Math.min(MAX, Math.max(MIN, n.s));
    if (!el) return { ...n, s };
    const mx = (el.clientWidth * (s - 1)) / 2;
    const my = (el.clientHeight * (s - 1)) / 2;
    return { s, x: Math.min(mx, Math.max(-mx, n.x)), y: Math.min(my, Math.max(-my, n.y)) };
  }, []);

  const snap = () => {
    if (!closing.current && root.current && !root.current.classList.contains('big')) rect.current = root.current.getBoundingClientRect();
  };

  // card <-> full screen as one continuous animation (clip + scale), so crossing zoom 1x never jumps
  const flip = (to: 'full' | 'card', done?: () => void) => {
    const el = root.current, b = box.current, r = rect.current;
    if (!el || !b || !r || typeof el.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) { done?.(); return; }
    const vw = innerWidth, vh = innerHeight, k = r.width / Math.min(vw, (vh * 1143) / 915);
    const clip = `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 20px)`;
    const tf = `translate(${r.left + r.width / 2 - vw / 2}px, ${r.top + r.height / 2 - vh / 2}px) scale(${k})`;
    const full = 'inset(0px round 0px)';
    const o = { duration: 320, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' as const };
    const [c, x] = to === 'full' ? [[clip, full], [tf, 'none']] : [[full, clip], ['none', tf]];
    anim.current = [el.animate({ clipPath: c }, o), b.animate({ transform: x }, o)];
    anim.current[0].onfinish = () => { if (to === 'full') { anim.current.forEach((a) => a.cancel()); anim.current = []; } done?.(); };
  };

  useEffect(() => {
    const up = t.s > 1.001;
    if (up && !big) { setBig(true); }
    else if (up && big && closing.current) { anim.current.forEach((a) => a.cancel()); anim.current = []; closing.current = false; }
    else if (!up && big && !closing.current && tgt.current.s <= 1.001) {
      closing.current = true;
      flip('card', () => { closing.current = false; setBig(false); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.s, big]);

  useLayoutEffect(() => {
    if (big) { flip('full'); return; }
    anim.current.forEach((a) => a.cancel()); anim.current = [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big]);

  useEffect(() => {
    if (!big) return;
    document.documentElement.classList.add('fp-zoomed');
    return () => document.documentElement.classList.remove('fp-zoomed');
  }, [big]);

  // jump straight to a transform (touch drag / pinch must track the fingers 1:1)
  const put = useCallback((n: T) => {
    cancelAnimationFrame(raf.current); raf.current = 0;
    cur.current = tgt.current = n; setT(n);
  }, []);

  // ease toward a target: smooths trackpad pinch (ctrl+wheel arrives in coarse steps), mouse wheel and +/- buttons
  const go = useCallback((n: T) => {
    tgt.current = clamp(n);
    if (raf.current) return;
    const tick = () => {
      const c = cur.current, g = tgt.current;
      const m: T = { s: c.s + (g.s - c.s) * 0.3, x: c.x + (g.x - c.x) * 0.3, y: c.y + (g.y - c.y) * 0.3 };
      const done = Math.abs(g.s - m.s) < 0.001 && Math.abs(g.x - m.x) < 0.3 && Math.abs(g.y - m.y) < 0.3;
      cur.current = done ? g : m; setT(cur.current);
      raf.current = done ? 0 : requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [clamp]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // zoom by factor around a point (relative to the box centre) so the point under the cursor stays put
  const zoomAt = useCallback((f: number, px = 0, py = 0) => {
    snap();
    const p = tgt.current;
    const s = Math.min(MAX, Math.max(MIN, p.s * f));
    const k = s / p.s;
    go({ s, x: px - (px - p.x) * k, y: py - (py - p.y) * k });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  useEffect(() => {
    setCanFs(canFullscreen(document, isIOS(navigator.userAgent, navigator.maxTouchPoints)));
    const sync = () => { setFs(document.fullscreenElement === root.current); put({ s: 1, x: 0, y: 0 }); }; // box size changes, so start fresh
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [put]);

  // pinch must zoom only the plan, never the whole page (Android: touch-action; iOS Safari: gesturestart)
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.touchAction;
    const stop = (e: Event) => e.preventDefault();
    root.style.touchAction = 'none';
    document.addEventListener('gesturestart', stop);
    return () => { root.style.touchAction = prev; document.removeEventListener('gesturestart', stop); };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = rel(e);
      // trackpad pinch arrives as ctrl+wheel with tiny deltas, so it needs a bigger gain than a mouse wheel.
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    // Safari (macOS trackpad) sends gesture events instead of ctrl+wheel
    type G = Event & { scale: number; clientX: number; clientY: number };
    let base = 1;
    const gs = () => { base = 1; };
    const gc = (e: Event) => {
      const g = e as G; e.preventDefault();
      const p = rel(g); zoomAt(g.scale / base, p.x, p.y); base = g.scale;
    };
    el.addEventListener('gesturestart', gs);
    el.addEventListener('gesturechange', gc);
    return () => { el.removeEventListener('wheel', wheel); el.removeEventListener('gesturestart', gs); el.removeEventListener('gesturechange', gc); };
  }, [zoomAt]);

  const down = (e: React.PointerEvent) => {
    snap();
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    last.current = null;
  };
  const move = (e: React.PointerEvent) => {
    const m = pts.current;
    if (!m.has(e.pointerId)) return;
    const prev = m.get(e.pointerId)!;
    m.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (m.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0 && (e.pointerType !== 'mouse' || e.buttons === 1)) {
        if (!moved.current) { try { box.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
        moved.current = true;
        const p = cur.current; if (p.s > 1) put(clamp({ ...p, x: p.x + dx, y: p.y + dy }));
      }
    } else if (m.size === 2) {
      const [a, b] = [...m.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const c = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      if (last.current) {
        const l = last.current;
        const f = Math.pow(d / l.d, PINCH_GAIN);
        const p = cur.current;
        const s = Math.min(MAX, Math.max(MIN, p.s * f));
        const k = s / p.s;
        put(clamp({ s, x: c.x - (l.cx - p.x) * k, y: c.y - (l.cy - p.y) * k }));
      }
      last.current = { d, cx: c.x, cy: c.y };
      moved.current = true;
    }
  };
  const up = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); last.current = null; };

  return (
    <div ref={root} className={big ? 'zoom big' : 'zoom'} role="group" aria-label={label}>
      <div ref={box} className={t.s > 1 ? 'zoom-box zoomed' : 'zoom-box'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={(e) => { if (t.s > 1) go({ s: 1, x: 0, y: 0 }); else { const p = rel(e); zoomAt(2.5, p.x, p.y); } }}>
        <div className="zoom-layer" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, ['--z' as string]: t.s }}>{children}</div>
      </div>
      {onBack && (
        <button type="button" className="ctl zoom-back" aria-label={`Back to ${backLabel}`} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      )}
      {(fs || t.s > 1.001) && (
        <button type="button" className="ctl zoom-close" aria-label={fs ? 'Exit fullscreen' : 'Close zoom'}
          onClick={() => (fs ? void document.exitFullscreen() : go({ s: 1, x: 0, y: 0 }))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
      <div className="zoom-ctl" role="group" aria-label="Zoom controls">
        <button type="button" className="ctl" aria-label="Zoom in" disabled={t.s >= MAX} onClick={() => zoomAt(1.6)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" className="ctl" aria-label="Zoom out" disabled={t.s <= MIN} onClick={() => zoomAt(1 / 1.6)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        {canFs && !fs && (
          <button type="button" className="ctl zoom-fs" aria-label="Enter fullscreen" onClick={() => void root.current?.requestFullscreen().catch(() => {})}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
