'use client';
import { useEffect, useState } from 'react';
import { isPortraitSmallScreen } from '@/lib/device';

export function useNeedsRotate(): boolean {
  const [needs, setNeeds] = useState(false);
  useEffect(() => {
    const check = () => setNeeds(isPortraitSmallScreen(window.innerWidth, window.innerHeight));
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return needs;
}
