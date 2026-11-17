'use client';
import SceneFrame from './SceneFrame';
import SideMenu from './SideMenu';
import BrochureViewer from './BrochureViewer';
import { useProject } from '@/hooks/useProject';

export default function BrochureScene() {
  const { brochure } = useProject();
  return <SceneFrame bgNode={<BrochureViewer src={brochure.src} />} panel={<SideMenu active="/brochure" />} />;
}
