import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import project from '@/data/project.json';
import Navbar from '@/components/Navbar';
import { reducedMotion } from '@/hooks/useSceneIntro';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('logo variants', () => {
  it('homescreen uses the Figma Group 9 logo (gold -> grayish white -> white)', () => {
    render(<Navbar variant="light" />);
    expect(decodeURIComponent(screen.getByAltText('Urbania Realty').getAttribute('src')!)).toContain('urbania-group.webp');
  });
  it('other screens use the dark-text logo (gold -> black -> white)', () => {
    render(<Navbar variant="dark" />);
    expect(decodeURIComponent(screen.getByAltText('Urbania Realty').getAttribute('src')!)).toContain('urbania-logo-dark.webp');
  });
  it('both are local webp files listed in project.json', () => {
    expect(project.brand.partnerLogo).toMatch(/urbania-group\.webp$/);
    expect(project.brand.partnerLogoDark).toMatch(/dark\.webp$/);
  });
});

describe('reducedMotion', () => {
  it('reads prefers-reduced-motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    expect(reducedMotion()).toBe(true);
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    expect(reducedMotion()).toBe(false);
  });
});

describe('design tokens', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  it('declares the palette once in :root and components use the variables', () => {
    expect(css.match(/--ui:\s*(#\w+)/)?.[1].toLowerCase()).toBe('#b08538');
    expect(css.match(/--gold:\s*(#\w+)/)?.[1].toLowerCase()).toBe('#99712b');
    for (const t of ['--gold:', '--ui:', '--gold-accent:', '--gold-line:', '--grey:']) expect(css).toContain(t);
    const outsideRoot = css.slice(css.indexOf('}', css.indexOf(':root')));
    for (const hex of ['#d6a041', '#d9b25c', '#909090', '#b08538']) expect(outsideRoot.toLowerCase()).not.toContain(hex);
    for (const hex of ['#99712b', '#8f6a26']) expect(outsideRoot.toLowerCase()).not.toContain(hex);
  });
  it('animated elements use the individual translate property so GSAP transforms do not fight CSS', () => {
    expect(css).not.toMatch(/\.(explore|panel|tourbar|drag-hint)[^}]*transform: translate/);
  });
});
