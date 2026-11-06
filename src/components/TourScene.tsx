'use client';
import { useState } from 'react';
import SceneFrame from './SceneFrame';
import TourPanel from './TourPanel';
import Compass from './Compass';
import SideMenu from './SideMenu';
import { useProject } from '@/hooks/useProject';

export default function TourScene() {
  const { tour } = useProject();
  const [v, setV] = useState({ room: 'living', furnished: true });
  const [pan, setPan] = useState(0); // degrees; 360 = full turn of the background
  const drag = (dx: number) => setPan((p) => (p - dx * 0.25 + 360) % 360);
  return (
    <SceneFrame background={tour.background} bgPosition={`${(pan / 360) * 100}% 50%`}
      onBackgroundDrag={drag} shade
      panel={<><SideMenu active="/virtual-tour" /><TourPanel room={v.room} furnished={v.furnished} onChange={setV} /></>}>
      <Compass heading={pan} />
    </SceneFrame>
  );
}
