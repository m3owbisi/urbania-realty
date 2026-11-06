'use client';
import { useState } from 'react';
import SceneFrame from './SceneFrame';
import AerialPanel from './AerialPanel';
import PanoViewer from './PanoViewer';
import SideMenu from './SideMenu';
import { sceneFor, DEFAULT_SELECTION, type Selection } from '@/lib/pano';

export default function AerialScene() {
  const [s, setS] = useState<Selection>(DEFAULT_SELECTION);
  const scene = sceneFor(s);
  return (
    <SceneFrame
      bgNode={<PanoViewer sceneId={scene.id} persist={scene.persist} lockPitchAxis={scene.lockPitch} />}
      panel={
        <><SideMenu active="/aerial-view" /><AerialPanel mode={s.mode} onMode={(mode) => setS((p) => ({ ...p, mode }))} floor={s.floor} time={s.time} onChange={() => {}}
          onFloor={(floor) => setS({ mode: 'floor', floor, time: 'day' })}
          onTime={(time) => setS((p) => ({ ...p, mode: 'time', time }))} /></>
      } />
  );
}
