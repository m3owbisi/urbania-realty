'use client';
import { useEffect, useRef, useState } from 'react';
import SceneFrame from './SceneFrame';
import SideMenu from './SideMenu';
import RenderPanel from './RenderPanel';
import { useProject } from '@/hooks/useProject';

export default function RenderScene() {
  const { renders } = useProject();
  const [id, setId] = useState(renders.items[0].id);
  const i = Math.max(0, renders.items.findIndex((r) => r.id === id));
  const cur = renders.items[i];
  const len = renders.items.length;
  const go = (d: -1 | 1) => setId(renders.items[(i + d + len) % len].id);
  const goRef = useRef(go);
  goRef.current = go;
  // Gallery: swipe (finger / pen / mouse drag) or arrow keys, in portrait and landscape
  const start = useRef<{ x: number; y: number } | null>(null);
  const swipe = (e: React.PointerEvent) => {
    const a = start.current; start.current = null;
    if (!a) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goRef.current(dx < 0 ? 1 : -1);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') goRef.current(1); else if (e.key === 'ArrowLeft') goRef.current(-1); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  // Portrait renders keep their true shape; a blurred copy of the same image fills the sides behind it.
  const bg = (
    <div className="render-bg" key={cur.id} onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={swipe} onPointerCancel={() => { start.current = null; }}>
      {cur.portrait && <img className="render-blur" src={cur.src} alt="" aria-hidden="true" />}
      <img className={cur.portrait ? 'render-img contain' : 'render-img'} src={cur.src} alt={cur.label} draggable={false} />
    </div>
  );
  return (
    <SceneFrame bgNode={bg} shade
      panel={<><SideMenu active="/renders" /><RenderPanel current={cur.id} onChange={setId} /></>}>
      <p className="render-count" aria-label={`Render ${i + 1} of ${renders.items.length}`}>{i + 1} / {renders.items.length}</p>
    </SceneFrame>
  );
}
