'use client';
import { useState } from 'react';
import SceneFrame from './SceneFrame';
import SideMenu from './SideMenu';
import RenderPanel from './RenderPanel';
import { useProject } from '@/hooks/useProject';

export default function RenderScene() {
  const { renders } = useProject();
  const [id, setId] = useState(renders.items[0].id);
  const i = Math.max(0, renders.items.findIndex((r) => r.id === id));
  const cur = renders.items[i];
  // Portrait renders keep their true shape; a blurred copy of the same image fills the sides behind it.
  const bg = (
    <div className="render-bg" key={cur.id}>
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
