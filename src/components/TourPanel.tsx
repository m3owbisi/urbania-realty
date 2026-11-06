'use client';
import { useEffect, useRef } from 'react';
import { useProject } from '@/hooks/useProject';

interface Props { room: string; furnished: boolean; onChange: (v: { room: string; furnished: boolean }) => void }

export default function TourPanel({ room, furnished, onChange }: Props) {
  const { tour } = useProject();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [room]);
  const scroll = (dir: number) => strip.current?.scrollBy?.({ left: dir * 220, behavior: 'smooth' });
  return (
    <section className="tourbar" aria-label="Rooms">
      <button type="button" className="ctl chair" aria-label="Furniture" aria-pressed={furnished}
        onClick={() => onChange({ room, furnished: !furnished })}>
        <span className="mask chair-ico" aria-hidden="true" />
      </button>
      <button type="button" className="arrow" aria-label="Previous rooms" onClick={() => scroll(-1)}>
        <span className="mask left" aria-hidden="true" />
      </button>
      <div className="tabs" ref={strip}>
        {tour.rooms.map((r) => (
          <button key={r.id} type="button" className="tab" aria-pressed={r.id === room}
            onClick={() => onChange({ room: r.id, furnished })}>{r.label}</button>
        ))}
      </div>
      <button type="button" className="arrow" aria-label="Next rooms" onClick={() => scroll(1)}>
        <span className="mask right" aria-hidden="true" />
      </button>
    </section>
  );
}
