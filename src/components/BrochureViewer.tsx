'use client';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Pages draw lazily to canvas (works on iOS/Android, where an <iframe> PDF shows one page or forces a download)
// and are released again once far off-screen, so a 27-page brochure stays light on tablets.
function Page({ doc, n }: { doc: PDFDocumentProxy; n: number }) {
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
      const vp = page.getViewport({ scale: (el.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5)) / base.width });
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
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? void draw() : release()), { rootMargin: '200% 0px' });
    io.observe(el);
    return () => { dead = true; io.disconnect(); task?.cancel(); };
  }, [doc, n]);
  return <div ref={box} className="brochure-page"><canvas ref={canvas} aria-label={`Brochure page ${n}`} /></div>;
}

export default function BrochureViewer({ src }: { src: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [cover, setCover] = useState('');
  const [failed, setFailed] = useState(false);
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
      <div className="brochure" role="document" aria-label="Brochure">
        {failed && <p className="brochure-msg">The brochure could not be loaded. <a href={src} download>Download the PDF</a></p>}
        {!doc && !failed && <p className="brochure-msg">Loading brochure…</p>}
        {doc && Array.from({ length: doc.numPages }, (_, i) => <Page key={i} doc={doc} n={i + 1} />)}
      </div>
    </>
  );
}
