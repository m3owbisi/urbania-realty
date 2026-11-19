'use client';
import { useEffect, useRef, useState } from 'react';
import { useSceneIntro } from '@/hooks/useSceneIntro';
import Navbar from './Navbar';
import Watermark from './Watermark';
import ControlBar from './ControlBar';
import RotateOverlay from './Overlay';
import { useNeedsRotate } from '@/hooks/useOrientation';
import { canFullscreen, isIOS, isInstalledPwa } from '@/lib/device';

interface Props {
  background?: string;
  bgNode?: React.ReactNode;
  filter?: string;
  panel?: React.ReactNode;
  children?: React.ReactNode;
  onBackgroundDrag?: (dx: number) => void;
  showHome?: boolean;
  shade?: boolean | 'left';
  bgPosition?: string;
  hiddenView?: React.ReactNode; // stays visible while the interface is hidden
}

export default function SceneFrame({ background, bgNode, filter, panel, children, onBackgroundDrag, bgPosition, hiddenView, showHome = true, shade = false }: Props) {
  const [uiHidden, setUiHidden] = useState(false);
  const [fs, setFs] = useState(false);
  const [showFs, setShowFs] = useState(false);
  const needsRotate = useNeedsRotate();
  const root = useRef<HTMLElement>(null);
  useSceneIntro(root);

  useEffect(() => {
    setShowFs(!isInstalledPwa(window, document) && canFullscreen(document, isIOS(navigator.userAgent, navigator.maxTouchPoints)));
    const getFs = () => Boolean(document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement);
    setFs(getFs());
    const sync = () => setFs(getFs());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggleFs = () => {
    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fsEl) {
      if (doc.exitFullscreen) void doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) void doc.webkitExitFullscreen();
    } else {
      const el = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) void el.webkitRequestFullscreen();
    }
  };

  const drag = (e: React.PointerEvent) => {
    if (!onBackgroundDrag || e.buttons !== 1) return;
    onBackgroundDrag(e.movementX);
  };

  return (
    <main ref={root} className="home scene" onPointerMove={drag}
      style={background ? { backgroundImage: `url(${background})`, backgroundPosition: bgPosition } : undefined}>
      {bgNode}
      {shade && <div className={shade === 'left' ? 'shade-left' : 'shade'} aria-hidden="true" />}
      {filter && <div className="tint" style={{ background: filter }} aria-hidden="true" />}
      <div className={uiHidden ? 'ui ui-hidden' : 'ui'}>
        <Navbar variant="dark" />
        {panel}
        {children}
        <Watermark />
      </div>
      {uiHidden && hiddenView}
      <ControlBar showHome={showHome} showFullscreen={showFs} isFullscreen={fs} onToggleFullscreen={toggleFs}
        uiHidden={uiHidden} onToggleUI={() => setUiHidden((v) => !v)} />
      <RotateOverlay visible={needsRotate} />
    </main>
  );
}
