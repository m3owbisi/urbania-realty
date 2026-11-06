'use client';
import { useRef } from 'react';
import { useHomeIntro } from '@/hooks/useSceneIntro';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import Watermark from './Watermark';
import RotateOverlay from './Overlay';
import { useProject } from '@/hooks/useProject';
import { useNeedsRotate } from '@/hooks/useOrientation';

export default function HomeShell() {
  const { hero } = useProject();
  const needsRotate = useNeedsRotate();
  const root = useRef<HTMLElement>(null);
  useHomeIntro(root);
  return (
    <main ref={root} className="home">
      <div className="hero-bg" style={{ backgroundImage: `url(${hero.background})` }} aria-hidden="true" />
      <Navbar />
      <HeroSection />
      <Watermark />
      <RotateOverlay visible={needsRotate} />
    </main>
  );
}
