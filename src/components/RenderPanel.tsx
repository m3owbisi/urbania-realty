"use client";
import { useEffect, useRef } from "react";
import { useProject } from "@/hooks/useProject";

// Same pill strip as the virtual tour (Figma Frame 51), minus the furniture toggle.
export default function RenderPanel({
  current,
  onChange,
}: {
  current: string;
  onChange: (id: string) => void;
}) {
  const { renders } = useProject();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [current]);
  const scroll = (dir: number) =>
    strip.current?.scrollBy?.({ left: dir * 220, behavior: "smooth" });
  return (
    <section className="tourbar" aria-label="Renders">
      <button
        type="button"
        className="arrow"
        aria-label="Previous renders"
        onClick={() => scroll(-1)}
      >
        <span className="mask left" aria-hidden="true" />
      </button>
      <div className="tabs" ref={strip}>
        {renders.items.map((r) => (
          <button
            key={r.id}
            type="button"
            className="tab"
            aria-pressed={r.id === current}
            onClick={() => onChange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="arrow"
        aria-label="Next renders"
        onClick={() => scroll(1)}
      >
        <span className="mask right" aria-hidden="true" />
      </button>
    </section>
  );
}
