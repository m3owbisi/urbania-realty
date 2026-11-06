'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useProject } from '@/hooks/useProject';
import { reducedMotion } from '@/hooks/useSceneIntro';

export default function ExplorePanel({ active, open = true, onCollapse }: { active: string; open?: boolean; onCollapse?: () => void }) {
  const { menu } = useProject();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selected, setSelected] = useState(Math.max(0, menu.findIndex((m) => m.href === active)));
  const [hover, setHover] = useState<number | null>(null);
  const at = hover ?? selected;

  const choose = (i: number, href: string) => {
    setSelected(i); // selector slides to the item and locks there
    setHover(null);
    clearTimeout(timer.current);
    if (href !== active) timer.current = setTimeout(() => router.push(href), reducedMotion() ? 0 : 420);
  };

  return (
    <aside className={open ? 'explore' : 'explore closed'} aria-label="Explore" inert={!open}>
      <p className="eyebrow">Explore</p>
      {onCollapse && (
        <button type="button" className="collapse" aria-label="Collapse menu" onClick={onCollapse}>
          <span className="mask left" aria-hidden="true" />
        </button>
      )}
      <ul onMouseLeave={() => setHover(null)}>
        <span className="selector" data-selector style={{ ['--i' as string]: at }} aria-hidden="true" />
        {menu.map((m, i) => (
          <li key={m.href} onMouseEnter={m.active ? () => setHover(i) : undefined}>
            {m.active ? (
              <Link href={m.href} aria-current={i === selected ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); choose(i, m.href); }}>
                <span className={m.href === active ? 'num on' : 'num'}>{m.number}</span>
                <span className="lbl">{m.label}</span>
              </Link>
            ) : (
              <span className="item inactive" aria-disabled="true">
                <span className="num">{m.number}</span>
                <span className="lbl">{m.label}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
