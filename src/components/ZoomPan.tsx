'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN = 1;
const MAX = 5;
const PINCH_GAIN = 2; // fingers move less than the image zooms, so one spread is enough
export type ZoomTransform = { s: number; x: number; y: number };
type T = ZoomTransform;

// Pinch / wheel / double-tap / drag zoom for one child. Children get `--z` (current scale) so overlays can counter-scale.
// Zoom is always clipped to the plan's own rounded box. "Expanded" is a CSS overlay (position: fixed), never the Fullscreen API,
// so minimizing can't leave an app-wide fullscreen. onBack (optional) adds a bottom-left Back button.
export default function ZoomPan({
  children,
  label = 'Zoom',
  onBack,
  backLabel = 'Back',
  initialTransform,
  onTransformChange,
}: {
  children: React.ReactNode;
  label?: string;
  onBack?: () => void;
  backLabel?: string;
  initialTransform?: T;
  onTransformChange?: (t: T) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false); // expanded overlay, independent of the browser / PWA fullscreen
  const [t, setT] = useState<T>(() => initialTransform ?? { s: 1, x: 0, y: 0 });
  const cur = useRef<T>(initialTransform ?? { s: 1, x: 0, y: 0 }); // what is drawn
  const tgt = useRef<T>(initialTransform ?? { s: 1, x: 0, y: 0 }); // where wheel / trackpad pinch / buttons are heading
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

  useEffect(() => {
    if (!big) return;
    document.documentElement.classList.add('fp-zoomed');
    // capture + stop: Esc minimizes the plan only, it must not also close a unit view underneath
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setBig(false); put({ s: 1, x: 0, y: 0 }); } };
    window.addEventListener('keydown', k, true);
    return () => { document.documentElement.classList.remove('fp-zoomed'); window.removeEventListener('keydown', k, true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big]);

  useEffect(() => {
    onTransformChange?.(t);
  }, [t, onTransformChange]);

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

  // box size changes between card and overlay, so start fresh
  const toggleBig = (v: boolean) => { put({ s: 1, x: 0, y: 0 }); setBig(v); };

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

  const ico = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

  return (
    <div className={big ? 'zoom big' : 'zoom'} role="group" aria-label={label}>
      <div ref={box} className={t.s > 1 ? 'zoom-box zoomed' : 'zoom-box'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={(e) => { if (t.s > 1) go({ s: 1, x: 0, y: 0 }); else { const p = rel(e); zoomAt(2.5, p.x, p.y); } }}>
        <div className="zoom-layer" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, ['--z' as string]: t.s }}>{children}</div>
      </div>
      {onBack && (
        <button type="button" className="ctl zoom-back" aria-label={`Back to ${backLabel}`} onClick={onBack}>
          <svg {...ico}><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      )}
      <div className="zoom-ctl" role="group" aria-label="Zoom controls">
        <button type="button" className="ctl" aria-label="Zoom in" disabled={t.s >= MAX} onClick={() => zoomAt(1.6)}>
          <svg {...ico}><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" className="ctl" aria-label="Zoom out" disabled={t.s <= MIN} onClick={() => zoomAt(1 / 1.6)}>
          <svg {...ico}><path d="M5 12h14" /></svg>
        </button>
        {big ? (
          // the old Close, shown as Minimize: back to the page layout. Touches no browser fullscreen.
          <button type="button" className="ctl zoom-close" aria-label="Minimize" onClick={() => toggleBig(false)}>
            <svg {...ico}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
          </button>
        ) : (
          <button type="button" className="ctl zoom-fs" aria-label="Expand floor plan" onClick={() => toggleBig(true)}>
            <svg {...ico}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
