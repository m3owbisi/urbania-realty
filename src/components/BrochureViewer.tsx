'use client';
import { forwardRef, useEffect, useRef, useState, type ComponentType } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// The PDF is the real source: every page is drawn by pdf.js, lazily, and handed to react-pageflip (StPageFlip) as an <img>.
// An <img> (not a canvas) because the flip engine clones a page while it turns, and a cloned canvas comes out blank.
// Only pages within NEAR of the open spread hold a picture; the rest are released, so a 27-page brochure stays light on phones.
const NEAR = 3;

const Page = forwardRef<HTMLDivElement, { doc: PDFDocumentProxy; n: number; live: boolean }>(function Page({ doc, n, live }, ref) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!live) return;
    let dead = false, made = '';
    let task: { cancel: () => void } | undefined;
    (async () => {
      const page = await doc.getPage(n);
      if (dead) return;
      const base = page.getViewport({ scale: 1 });
      // shortcut: drawn once at a size picked from the screen height, not redrawn on resize; fine for a brochure, upgrade if pages look soft on a big window resize
      const w = Math.min(base.width, Math.max(540, (innerHeight - 200) * (base.width / base.height) * Math.min(devicePixelRatio || 1, 2)));
      const vp = page.getViewport({ scale: w / base.width });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      const r = page.render({ canvas: c, viewport: vp });
      task = r;
      await r.promise;
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
      if (dead || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    })().catch(() => {});
    return () => { dead = true; task?.cancel(); if (made) URL.revokeObjectURL(made); setUrl(''); };
  }, [doc, n, live]);
  return <div ref={ref} className="flip-page">{url && <img src={url} alt={`Brochure page ${n}`} draggable={false} />}</div>;
});

type Flip = { pageFlip: () => { flipNext: () => void; flipPrev: () => void } };
type Mode = 'landscape' | 'portrait';

export default function BrochureViewer({ src }: { src: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [Book, setBook] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [cover, setCover] = useState('');
  const [ratio, setRatio] = useState(16 / 9); // page height / width, read from the PDF itself
  const [failed, setFailed] = useState(false);
  const [cur, setCur] = useState(0);
  const [mode, setMode] = useState<Mode>('landscape');
  const book = useRef<Flip>(null);

  useEffect(() => {
    let dead = false;
    let loading: { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> } | undefined;
    (async () => {
      const [pdfjs, flip] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('react-pageflip')]); // client-only: StPageFlip touches window
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      loading = pdfjs.getDocument({ url: src });
      const d = await loading.promise;
      if (dead) return;
      // small copy of the cover, blurred behind the book
      const p1 = await d.getPage(1);
      const base = p1.getViewport({ scale: 1 });
      const vp = p1.getViewport({ scale: 480 / base.width });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await p1.render({ canvas: c, viewport: vp }).promise;
      if (dead) return;
      setCover(c.toDataURL('image/jpeg', 0.7));
      setRatio(base.height / base.width);
      setBook(() => flip.default as unknown as ComponentType<Record<string, unknown>>);
      setDoc(d);
    })().catch(() => !dead && setFailed(true));
    return () => { dead = true; void loading?.destroy(); };
  }, [src]);

  const count = doc?.numPages ?? 0;
  const spread = mode === 'landscape' && cur > 0 && cur + 1 < count; // cover and a last odd page stand alone
  const lastShown = spread ? cur + 1 : cur;
  const flipNext = () => book.current?.pageFlip().flipNext();
  const flipPrev = () => book.current?.pageFlip().flipPrev();

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') book.current?.pageFlip().flipNext();
      else if (e.key === 'ArrowLeft') book.current?.pageFlip().flipPrev();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const arrow = (d: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );

  return (
    <>
      <div className="brochure-bg">{cover && <img className="brochure-blur" src={cover} alt="" aria-hidden="true" />}</div>
      {failed && <p className="brochure-msg">The brochure could not be loaded. <a href={src} download>Download the PDF</a></p>}
      {!doc && !failed && <p className="brochure-msg">Loading brochure…</p>}
      {doc && Book && (
        <>
          <div className="flip-stage" role="document" aria-label="Brochure">
            <Book ref={book} className="flip-box" style={{}} width={540} height={Math.round(540 * ratio)}
              size="stretch" minWidth={400} maxWidth={1080} minHeight={280} maxHeight={1920}
              showCover usePortrait autoSize={false} drawShadow maxShadowOpacity={0.5} flippingTime={700}
              renderOnlyPageLengthChange
              onInit={(e: { data: { page: number; mode: Mode } }) => { setCur(e.data.page); setMode(e.data.mode); }}
              onFlip={(e: { data: number }) => setCur(e.data)}
              onChangeOrientation={(e: { data: Mode }) => setMode(e.data)}>
              {Array.from({ length: count }, (_, i) => <Page key={i} doc={doc} n={i + 1} live={Math.abs(i - cur) <= NEAR} />)}
            </Book>
          </div>
          <div className="flip-nav" role="group" aria-label="Brochure pages">
            <button type="button" className="ctl" aria-label="Previous page" disabled={cur === 0} onClick={flipPrev}>{arrow('M15 5l-7 7 7 7')}</button>
            <span className="flip-count" aria-live="polite">{spread ? `${cur + 1}–${cur + 2}` : cur + 1} / {count}</span>
            <button type="button" className="ctl" aria-label="Next page" disabled={lastShown >= count - 1} onClick={flipNext}>{arrow('M9 5l7 7-7 7')}</button>
          </div>
        </>
      )}
    </>
  );
}
