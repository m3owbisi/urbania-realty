import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync, existsSync } from 'fs';
import sharp from 'sharp';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import ControlBar from '@/components/ControlBar';
import ExplorePanel from '@/components/ExplorePanel';
import SideMenu from '@/components/SideMenu';
import StaticScene from '@/components/StaticScene';
afterEach(cleanup);

describe('view button: hides every control and tucks into the leftmost slot', () => {
  it('other buttons disappear and the eye shifts left by the number of buttons before it', () => {
    const { container } = render(<ControlBar showFullscreen uiHidden onToggleUI={() => {}} />);
    expect(screen.queryByRole('link', { name: /home/i })).toBeNull();            // aria-hidden while the UI is hidden
    expect(screen.queryByRole('button', { name: /full ?screen/i })).toBeNull();
    const eye = screen.getByRole('button', { name: /show interface/i });
    expect(eye.style.getPropertyValue('--shift')).toBe('2');
    expect(container.querySelector('.controls')?.getAttribute('data-hidden')).toBe('true');
  });
  it('shift follows which buttons exist (no home on the elevation screen, no fullscreen on iOS)', () => {
    render(<ControlBar showHome={false} showFullscreen={false} uiHidden onToggleUI={() => {}} />);
    expect(screen.getByRole('button', { name: /show interface/i }).style.getPropertyValue('--shift')).toBe('0');
  });
  it('everything is back when the UI is visible', () => {
    render(<ControlBar showFullscreen uiHidden={false} onToggleUI={() => {}} />);
    expect(screen.getByRole('link', { name: /home/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /hide interface/i })).toBeTruthy();
  });
});

describe('collapsible menu bar on the other screens', () => {
  it('ExplorePanel can be closed and exposes a collapse arrow', () => {
    const onCollapse = vi.fn();
    const { container } = render(<ExplorePanel active="/aerial-view" open onCollapse={onCollapse} />);
    fireEvent.click(screen.getByRole('button', { name: /collapse menu/i }));
    expect(onCollapse).toHaveBeenCalled();
    cleanup();
    const closed = render(<ExplorePanel active="/aerial-view" open={false} />);
    const aside = closed.container.querySelector('aside')!;
    expect(aside.className).toContain('closed');
    expect(aside.hasAttribute('inert')).toBe(true);
    void container;
  });
  it('SideMenu: closed by default (menu hidden); one arrow opens it, flips, and the same arrow collapses it', () => {
    const { container } = render(<SideMenu active="/aerial-view" />);
    const aside = () => container.querySelector('aside')!;
    expect(aside().hasAttribute('inert')).toBe(true);            // menu is NOT visible until the arrow is clicked
    const tab = screen.getByRole('button', { name: /open menu/i });
    expect(tab.getAttribute('aria-expanded')).toBe('false');
    expect(tab.getAttribute('data-open')).toBe('false');
    fireEvent.click(tab);
    expect(aside().hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('link', { name: /aerial view/i }).getAttribute('aria-current')).toBe('page');
    const collapse = screen.getByRole('button', { name: /collapse menu/i });
    expect(collapse.getAttribute('data-open')).toBe('true');     // CSS rotates the arrow 180deg
    fireEvent.click(collapse);
    expect(aside().hasAttribute('inert')).toBe(true);
  });
  it('floor plan screen has the tab; the 3D elevation screen shows the menu without any tab', () => {
    const other = render(<StaticScene background="/images/hero-bg.webp" active="/floor-plan" />);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeTruthy();
    other.unmount();
    render(<StaticScene entry background="/images/elevation.webp" active="/elevation" />);
    expect(screen.queryByRole('button', { name: /open menu/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /collapse menu/i })).toBeNull();
    expect(screen.getByRole('link', { name: /3d elevation/i })).toBeTruthy();
  });
});

describe('colour roles (design system)', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  it('keeps one token per role: brand #99712B, chrome #B08538, accent #D6A041', () => {
    expect(root).toMatch(/--gold:\s*#99712b/i);
    expect(root).toMatch(/--ui:\s*#b08538/i);
    expect(root).toMatch(/--gold-accent:\s*#d6a041/i);
    expect(root).toMatch(/--gold-line:\s*#d9b25c/i);
  });
  it('brand colour is for the homescreen copy/CTA; chrome colour for buttons, borders, chips', () => {
    expect(css).toMatch(/h1\s*\{[^}]*var\(--gold\)/);
    expect(css).toMatch(/\.cta\s*\{[^}]*var\(--gold\)/);
    expect(css).toMatch(/\.ctl\s*\{[^}]*var\(--ui\)/);
    expect(css).toMatch(/\.chip\[aria-pressed='true'\]\s*\{[^}]*var\(--ui\)/);
    expect(css).toMatch(/\.explore\s*\{[^}]*border:[^;]*var\(--ui\)/);
  });
  it('elevation has a soft bottom shade like the Figma gradient rectangle', () => {
    expect(css).toMatch(/\.shade\s*\{[^}]*linear-gradient/);
  });
  it('view button animates into the leftmost slot', () => {
    expect(css).toMatch(/\.eye\s*\{[^}]*transition:[^;]*translate/);
    expect(css).toMatch(/\[data-hidden='true'\]\s+\.eye\s*\{[^}]*translate:\s*calc\(var\(--shift\)/);
  });
});

describe('elevation image', () => {
  it('is a full-HD webp with the building headroom', async () => {
    const m = await sharp('public/images/elevation.webp').metadata();
    expect([m.format, m.width, m.height]).toEqual(['webp', 1920, 1080]);
  });
});

describe('intro animation never leaves the closed menu stuck invisible', () => {
  it('after the timeline finishes, the closed menu has no inline opacity override', async () => {
    const gsap = (await import('gsap')).default;
    const { container } = render(<StaticScene background="/images/hero-bg.webp" active="/floor-plan" />);
    gsap.globalTimeline.getChildren(true, true, true).forEach((t) => t.progress(1));
    const aside = container.querySelector('aside') as HTMLElement;
    expect(aside.style.opacity).toBe('');
    expect(aside.style.transform).toBe('');
  });
});

describe('Tailwind', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  it('is wired for theme + utilities only (no preflight resetting the Figma-accurate CSS)', () => {
    expect(css).toMatch(/@import\s+"tailwindcss\/theme\.css"/);
    expect(css).toMatch(/@import\s+"tailwindcss\/utilities\.css"/);
    expect(css).not.toMatch(/@import\s+"tailwindcss"/);
    expect(css).not.toMatch(/tailwindcss\/preflight/);
    expect(readFileSync('postcss.config.mjs', 'utf8')).toContain('@tailwindcss/postcss');
  });
  it('exposes the colour roles as utilities (bg-brand, text-chrome, text-accent ...)', () => {
    const theme = css.slice(css.indexOf('@theme'), css.indexOf('}', css.indexOf('@theme')));
    for (const t of ['--color-brand', '--color-chrome', '--color-accent', '--color-line', '--color-muted']) expect(theme).toContain(t);
  });
});

describe('PWA', () => {
  it('manifest: fullscreen, landscape, installable', async () => {
    const m = (await import('@/app/manifest')).default();
    expect(m.display).toBe('fullscreen');
    expect(m.orientation).toBe('landscape');
    expect(m.start_url).toBe('/');
    expect(m.background_color).toBe('#000000');
    expect(m.icons?.some((i) => i.sizes === '512x512')).toBe(true);
    expect(existsSync('src/app/icon.png')).toBe(true);
    expect(existsSync('src/app/apple-icon.png')).toBe(true);
  });
  it('layout: viewport covers notches, iOS can run it as a standalone app', async () => {
    const l = await import('@/app/layout');
    expect(l.viewport.viewportFit).toBe('cover');
    expect(l.viewport.themeColor).toBe('#000000');
    expect(l.metadata.appleWebApp).toMatchObject({ capable: true });
  });
  it('touch hardening: no tap flash, no double-tap zoom, no text selection on controls', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
    expect(css).toMatch(/touch-action:\s*manipulation/);
  });
});

describe('elevation screen art', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  it('uses the supplied webp and the Figma left gradient (764px, 270deg)', () => {
    expect(css).toMatch(/\.shade-left\s*\{[^}]*270deg/);
    expect(css).toMatch(/\.shade-left\s*\{[^}]*width:\s*47\.75rem/);   // 764px
  });
});
