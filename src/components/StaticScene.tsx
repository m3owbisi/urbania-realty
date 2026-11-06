'use client';
import SceneFrame from './SceneFrame';
import ExplorePanel from './ExplorePanel';
import SideMenu from './SideMenu';
import DragHint from './DragHint';

// The elevation screen is the entry after the homescreen: the menu is always open there (no tab, no collapse, no Home).
export default function StaticScene({ background, active, entry = false }: { background: string; active: string; entry?: boolean }) {
  return (
    <SceneFrame background={background} showHome={!entry} shade={entry ? 'left' : true}
      panel={entry ? <><ExplorePanel active={active} /><DragHint /></> : <SideMenu active={active} />} />
  );
}
