import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { existsSync } from 'fs';
import project from '@/data/project.json';
import RenderPanel from '@/components/RenderPanel';
import RenderScene from '@/components/RenderScene';
import ExplorePanel from '@/components/ExplorePanel';
import { headingFor } from '@/lib/pano';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
vi.stubGlobal('IntersectionObserver', IO);
vi.stubGlobal('ResizeObserver', IO);

describe('renders', () => {
  it('every render exists on disk as WebP; the brochure PDF is served from the site', () => {
    for (const r of project.renders.items) {
      expect(r.src.endsWith('.webp')).toBe(true);
      expect(existsSync(`public${r.src}`)).toBe(true);
    }
    expect(project.renders.items.map((r) => r.id)).toEqual(['reception', 'terrace', 'banquet-1', 'banquet-2', 'gym-1', 'gym-2']);
    expect(existsSync(`public${project.brochure.src}`)).toBe(true);
    expect(existsSync('src/app/renders/page.tsx') && existsSync('src/app/brochure/page.tsx')).toBe(true);
  });
  it('pill strip selects a render and has working left/right arrows with edge fade mask', () => {
    const fn = vi.fn();
    render(<RenderPanel current="reception" onChange={fn} />);
    expect(screen.getByRole('button', { name: 'Reception' }).getAttribute('aria-pressed')).toBe('true');
    const prev = screen.getByRole('button', { name: /previous renders/i });
    const next = screen.getByRole('button', { name: /next renders/i });
    expect(prev).toBeTruthy();
    expect(next).toBeTruthy();
    fireEvent.click(next);
    expect(fn).toHaveBeenCalledWith('terrace');
    fireEvent.click(prev);
    expect(fn).toHaveBeenCalledWith('gym-2');
    fireEvent.click(screen.getByRole('button', { name: 'Gym 2' }));
    expect(fn).toHaveBeenCalledWith('gym-2');
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('type')).toBe('button');
  });
  it('shows n / total and a blurred backdrop only behind portrait renders', () => {
    const { container } = render(<RenderScene />);
    const total = project.renders.items.length;
    expect(screen.getByText(`1 / ${total}`)).toBeTruthy();
    expect(container.querySelector('.render-blur')).not.toBeNull();       // reception is portrait
    fireEvent.click(screen.getByRole('button', { name: 'Terrace' }));
    expect(screen.getByText(`2 / ${total}`)).toBeTruthy();
    expect(container.querySelector('.render-blur')).toBeNull();
  });
});

describe('explore menu', () => {
  it('number turns gold on hover exactly like on selection', () => {
    const { container } = render(<ExplorePanel active="/elevation" />);
    const nums = () => [...container.querySelectorAll('.num')].map((n) => n.classList.contains('on'));
    expect(nums()[0]).toBe(true);
    fireEvent.mouseEnter(screen.getByRole('link', { name: /aerial view/i }).closest('li')!);
    expect(nums().indexOf(true)).toBe(project.menu.findIndex((m) => m.label === 'Aerial View'));
    expect(nums().filter(Boolean)).toHaveLength(1);
  });
  it('Renders and Brochure are in-site routes (no new tab, no download)', () => {
    render(<ExplorePanel active="/renders" />);
    expect(screen.getByRole('link', { name: /renders/i }).getAttribute('href')).toBe('/renders');
    const b = screen.getByRole('link', { name: /brochure/i });
    expect(b.getAttribute('href')).toBe('/brochure');
    expect(b.getAttribute('target')).toBeNull();
  });
});

describe('compass heading', () => {
  it('adds the north bearing to the view yaw and wraps to 0-360', () => {
    expect(headingFor(0, 0)).toBe(0);
    expect(headingFor(Math.PI / 2, 0)).toBeCloseTo(90);
    expect(headingFor(-Math.PI / 2, 0)).toBeCloseTo(270);
    expect(headingFor(0, 30)).toBe(30);
  });
});

// Regression: Aerial used to stay locked to floor limits after switching from Floor (stale isFloor in the one-shot effect).
describe('PanoViewer Aerial after Floor', () => {
  it('uses the free aerial limiter (not the floor pitch clamp) once isFloor turns false', async () => {
    const traditional = vi.fn(() => 'aerial-limiter');
    const limiters: unknown[] = [];
    vi.doMock('marzipano', () => {
      class RectilinearView {
        static limit = { traditional };
        constructor(_p: unknown, limiter: unknown) { limiters.push(limiter); }
        yaw() { return 0; } pitch() { return 0; } fov() { return 1.57; }
        setYaw() {} setPitch() {} setFov() {}
        addEventListener() {} removeEventListener() {}
      }
      class Viewer {
        controls() { return { disable() {} }; }
        createScene() { return { switchTo() {} }; }
        destroyScene() {} destroy() {}
      }
      const ImageUrlSource = { fromString: () => ({}) };
      class CubeGeometry {}
      return { default: { Viewer, RectilinearView, ImageUrlSource, CubeGeometry } };
    });
    const { default: PanoViewer } = await import('@/components/PanoViewer');
    const { rerender } = render(<PanoViewer sceneId={project.aerial.floorScenes['20th']} isFloor />);
    await waitFor(() => expect(limiters.length).toBe(1));
    expect(traditional).not.toHaveBeenCalled();
    rerender(<PanoViewer sceneId={project.aerial.timeScenes.day} isFloor={false} />);
    await waitFor(() => expect(limiters.length).toBe(2));
    expect(traditional).toHaveBeenCalledTimes(1);
    expect(limiters[1]).toBe('aerial-limiter');
  });
});
