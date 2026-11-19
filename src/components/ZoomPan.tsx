'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canFullscreen, isIOS } from '@/lib/device';

const MIN = 1;
const MAX = 5;
const PINCH_GAIN = 2; // fingers move less than the image zooms, so one spread is enough
type T = { s: number; x: number; y: number };

// Pinch / wheel / double-tap / drag zoom for one child. Children get `--z` (current scale) so overlays can counter-scale.
export default function ZoomPan({ children, label = 'Zoom' }: { children: React.ReactNode; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  const [canFs, setCanFs] = useState(false);
  const [t, setT] = useState<T>({ s: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ d: number; cx: number; cy: number } | null>(null);
  const moved = useRef(false);
  const big = t.s > 1;

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
    setT((p) => clamp({ ...p, x: 0, y: 0 }));
    return () => document.documentElement.classList.remove('fp-zoomed');
  }, [big, clamp]);

  // zoom by factor around a point (relative to the box centre) so the point under the cursor stays put
  const zoomAt = useCallback((f: number, px = 0, py = 0) => {
    setT((p) => {
      const s = Math.min(MAX, Math.max(MIN, p.s * f));
      const k = s / p.s;
      return clamp({ s, x: px - (px - p.x) * k, y: py - (py - p.y) * k });
    });
  }, [clamp]);

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  useEffect(() => {
    setCanFs(canFullscreen(document, isIOS(navigator.userAgent, navigator.maxTouchPoints)));
    const sync = () => { setFs(document.fullscreenElement === root.current); setT({ s: 1, x: 0, y: 0 }); }; // box size changes, so start fresh
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

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
    return () => el.removeEventListener('wheel', wheel);
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
        setT((p) => (p.s > 1 ? clamp({ ...p, x: p.x + dx, y: p.y + dy }) : p));
      }
    } else if (m.size === 2) {
      const [a, b] = [...m.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const c = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      if (last.current) {
        const l = last.current;
        const f = Math.pow(d / l.d, PINCH_GAIN);
        setT((p) => {
          const s = Math.min(MAX, Math.max(MIN, p.s * f));
          const k = s / p.s;
          return clamp({ s, x: c.x - (l.cx - p.x) * k, y: c.y - (l.cy - p.y) * k });
        });
      }
      last.current = { d, cx: c.x, cy: c.y };
      moved.current = true;
    }
  };
  const up = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); last.current = null; };

  return (
    <div ref={root} className={big ? 'zoom big' : 'zoom'} role="group" aria-label={label}>
      <div ref={box} className={t.s > 1 ? 'zoom-box zoomed' : 'zoom-box'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={(e) => { if (t.s > 1) setT({ s: 1, x: 0, y: 0 }); else { const p = rel(e); zoomAt(2.5, p.x, p.y); } }}>
        <div className="zoom-layer" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, ['--z' as string]: t.s }}>{children}</div>
      </div>
      {fs && (
        <button type="button" className="ctl zoom-close" aria-label="Exit fullscreen" onClick={() => void document.exitFullscreen()}>
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
