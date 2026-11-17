'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProject } from '@/hooks/useProject';

// Figma Frame 51 pill strip: 3 renders per view, draggable / scrollable / sliding with working left and right arrows and gradient corner fades.
// ponytail: native horizontal scroll with pointer drag and arrow buttons instead of react-horizontal-scrolling-menu (keeps React 19 compatibility, zero bundle overhead).
export default function RenderPanel({ current, onChange }: { current: string; onChange: (id: string) => void }) {
  const { renders } = useProject();
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, x: 0, left: 0 });
  const [edge, setEdge] = useState({ l: false, r: true });

  const sync = useCallback(() => {
    const e = box.current;
    if (e) setEdge({ l: e.scrollLeft > 2, r: e.scrollLeft < e.scrollWidth - e.clientWidth - 2 });
  }, []);

  useEffect(sync, [sync]);

  useEffect(() => {
    const e = box.current;
    const t = e?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (e && t) e.scrollTo?.({ left: t.offsetLeft - (e.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
  }, [current]);

  useEffect(() => {
    const e = box.current;
    if (!e) return;
    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      e.scrollLeft += ev.deltaX || ev.deltaY;
      sync();
    };
    e.addEventListener('wheel', wheel, { passive: false });
    return () => e.removeEventListener('wheel', wheel);
  }, [sync]);

  const step = (dir: -1 | 1) => {
    const len = renders.items.length;
    if (len === 0) return;
    const i = renders.items.findIndex((r) => r.id === current);
    const nextIdx = (i + dir + len) % len;
    onChange(renders.items[nextIdx].id);
  };

  const down = (ev: React.MouseEvent) => {
    const e = box.current;
    if (!e) return;
    drag.current = { down: true, moved: false, x: ev.clientX, left: e.scrollLeft };
    e.style.scrollSnapType = 'none';
  };

  const move = (ev: React.MouseEvent) => {
    const d = drag.current;
    if (!d.down || !box.current) return;
    const dx = ev.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    if (d.moved) {
      box.current.scrollLeft = d.left - dx;
      sync();
    }
  };

  const up = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    if (box.current) box.current.style.scrollSnapType = '';
  };

  return (
    <section className="tourbar renderbar" aria-label="Renders">
      <button
        type="button"
        className="arrow"
        aria-label="Previous renders"
        onClick={() => step(-1)}
      >
        <span className="mask left" aria-hidden="true" />
      </button>
      <div
        ref={box}
        className={`rs-tabs${edge.l ? ' fl' : ''}${edge.r ? ' fr' : ''}`}
        onScroll={sync}
        onMouseDown={down}
        onMouseMove={move}
        onMouseUp={up}
        onMouseLeave={up}
      >
        {renders.items.map((r) => (
          <button
            key={r.id}
            type="button"
            className="tab"
            aria-pressed={r.id === current}
            onClick={() => {
              if (!drag.current.moved) onChange(r.id);
              drag.current.moved = false;
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="arrow"
        aria-label="Next renders"
        onClick={() => step(1)}
      >
        <span className="mask right" aria-hidden="true" />
      </button>
    </section>
  );
}
