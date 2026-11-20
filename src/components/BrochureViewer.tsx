'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Pages draw lazily to canvas (works on iOS/Android, where an <iframe> PDF shows one page or forces a download)
// and are released again once far off-screen, so a 27-page brochure stays light on tablets.
const MAX_ZOOM = 4;
const MAX_PX = 2400; // canvas width cap, so a 4x zoom stays within phone / tablet memory

// zoom is the settled zoom level: pages redraw sharp at that size (while pinching they just stretch).
function Page({ doc, n, zoom }: { doc: PDFDocumentProxy; n: number; zoom: number }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let task: { cancel: () => void } | undefined;
    let drawn = false;
    let dead = false;
    const draw = async () => {
      if (drawn) return;
      drawn = true;
      const page = await doc.getPage(n);
      const c = canvas.current;
      if (dead || !drawn || !c) return;
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(el.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5), MAX_PX) / base.width });
      c.width = vp.width; c.height = vp.height;
      const r = page.render({ canvas: c, viewport: vp });
      task = r;
      r.promise.catch(() => {});
    };
    const release = () => {
      drawn = false;
      task?.cancel();
      if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; }
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? void draw() : release()), { rootMargin: zoom > 1 ? '50% 0px' : '200% 0px' });
    io.observe(el);
    return () => { dead = true; io.disconnect(); task?.cancel(); };
  }, [doc, n, zoom]);
  return <div ref={box} className="brochure-page"><canvas ref={canvas} aria-label={`Brochure page ${n}`} /></div>;
}

export default function BrochureViewer({ src }: { src: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [cover, setCover] = useState('');
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const z = useRef(1);
  const timer = useRef(0);
  const [zoom, setZoom] = useState(1);

  // zoom the pages (width scales through --bz) keeping the point under the fingers / cursor in place; the box scrolls both ways
  const zoomTo = useCallback((next: number, cx?: number, cy?: number) => {
    const el = box.current;
    if (!el) return;
    const n = Math.min(MAX_ZOOM, Math.max(1, next)), k = n / z.current;
    if (k === 1) return;
    const r = el.getBoundingClientRect();
    const px = cx === undefined ? r.width / 2 : cx - r.left, py = cy === undefined ? r.height / 2 : cy - r.top;
    const w = el.querySelector<HTMLElement>('.brochure-page')?.offsetWidth ?? r.width;
    const pad = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const u = el.scrollLeft + px - Math.max(0, (r.width - w) / 2), v = el.scrollTop + py - pad;
    z.current = n;
    el.style.setProperty('--bz', String(n));
    el.scrollLeft = u * k + Math.max(0, (r.width - w * k) / 2) - px;
    el.scrollTop = v * k + pad - py;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setZoom(z.current), 180);
  }, []);

  // pinch (touch), ctrl+wheel / trackpad pinch, double-tap: same in portrait and landscape
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let d0 = 0, z0 = 1, tap = { t: 0, x: 0, y: 0 }, from = { x: 0, y: 0 };
    const mid = (e: TouchEvent) => ({ x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 });
    const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 2) { d0 = dist(e); z0 = z.current; }
      else if (e.touches.length === 1) from = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const tm = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !d0) return;
      e.preventDefault();
      const m = mid(e);
      zoomTo((z0 * dist(e)) / d0, m.x, m.y);
    };
    const te = (e: TouchEvent) => {
      if (e.touches.length < 2) d0 = 0;
      if (e.touches.length || e.changedTouches.length !== 1) return;
      const c = e.changedTouches[0], now = Date.now();
      if (Math.hypot(c.clientX - from.x, c.clientY - from.y) > 10) { tap.t = 0; return; }
      if (now - tap.t < 300 && Math.hypot(c.clientX - tap.x, c.clientY - tap.y) < 30) {
        zoomTo(z.current > 1 ? 1 : 2.5, c.clientX, c.clientY);
        tap.t = 0;
      } else tap = { t: now, x: c.clientX, y: c.clientY };
    };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomTo(z.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    };
    const gs = (e: Event) => e.preventDefault(); // iOS Safari: pinch zooms the pages, not the whole page
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te, { passive: true });
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('gesturestart', gs);
    return () => {
      el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te);
      el.removeEventListener('wheel', wheel); el.removeEventListener('gesturestart', gs); clearTimeout(timer.current);
    };
  }, [zoomTo]);

  useEffect(() => {
    let dead = false;
    let loading: { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> } | undefined;
    (async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      loading = pdfjs.getDocument({ url: src });
      const d = await loading.promise;
      if (dead) return;
      setDoc(d);
      // small copy of the cover, blurred behind the pages
      const p1 = await d.getPage(1);
      const vp = p1.getViewport({ scale: 480 / p1.getViewport({ scale: 1 }).width });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await p1.render({ canvas: c, viewport: vp }).promise;
      if (!dead) setCover(c.toDataURL('image/jpeg', 0.7));
    })().catch(() => !dead && setFailed(true));
    return () => { dead = true; void loading?.destroy(); };
  }, [src]);
  return (
    <>
      <div className="brochure-bg">{cover && <img className="brochure-blur" src={cover} alt="" aria-hidden="true" />}</div>
      <div ref={box} className="brochure" role="document" aria-label="Brochure">
        {failed && <p className="brochure-msg">The brochure could not be loaded. <a href={src} download>Download the PDF</a></p>}
        {!doc && !failed && <p className="brochure-msg">Loading brochure…</p>}
        {doc && Array.from({ length: doc.numPages }, (_, i) => <Page key={i} doc={doc} n={i + 1} zoom={zoom} />)}
      </div>
    </>
  );
}
