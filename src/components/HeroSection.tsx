'use client';
import Link from 'next/link';
import { useProject } from '@/hooks/useProject';
import { canFullscreen, isIOS, isInstalledPwa } from '@/lib/device';

// Runs inside the click (a user gesture is required). iOS has no page Fullscreen API, so it just navigates.
const enterFullscreen = () => {
  if (!isInstalledPwa(window, document) && canFullscreen(document, isIOS(navigator.userAgent, navigator.maxTouchPoints))) {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }
};

export default function HeroSection() {
  const { hero } = useProject();
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1 data-reveal>{hero.headline}</h1>
        <p>
          {hero.subtextLines.map((line) => (
            <span key={line} data-line data-reveal className="line">{line}</span>
          ))}
        </p>
        <div data-reveal className="cta-wrap">
          <Link href={hero.cta.href} className="cta" onClick={enterFullscreen}>
            {hero.cta.label}
            <svg width="26" height="14" viewBox="0 0 26 14" fill="none" aria-hidden="true">
              <path d="M0 7h24M18 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
