import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import project from '@/data/project.json';
import ControlBar from '@/components/ControlBar';
import ExplorePanel from '@/components/ExplorePanel';
import DragHint from '@/components/DragHint';
import { existsSync } from 'fs';
import AerialPanel from '@/components/AerialPanel';
import TourPanel from '@/components/TourPanel';
import Compass from '@/components/Compass';
afterEach(cleanup);

describe('menu data', () => {
  it('has the five experiences in order, each a local route', () => {
    expect(project.menu.map((m) => m.href)).toEqual([
      '/elevation', '/virtual-tour', '/floor-plan', '/aerial-view', '/amenities', '/renders', '/brochure']);
    expect(project.menu.map((m) => m.number)).toEqual(['01', '02', '03', '04', '05', '06', '07']);
  });
  it('only elevation and aerial view are live for now; the rest stay listed but inactive', () => {
    expect(Object.fromEntries(project.menu.map((m) => [m.href, m.active]))).toEqual({
      '/elevation': true, '/virtual-tour': false, '/floor-plan': true, '/aerial-view': true, '/amenities': false,
      '/renders': true, '/brochure': true });
  });
  it('orders tour rooms like an architect walks a flat: living, kitchen, then bedrooms', () => {
    expect(project.tour.rooms.map((r) => r.id)).toEqual(['living', 'kitchen', 'bedroom1', 'bedroom2', 'bedroom3']);
  });
});

describe('ControlBar', () => {
  it('hides fullscreen on iOS and never shows a dead button', () => {
    render(<ControlBar showFullscreen={false} uiHidden={false} onToggleUI={() => {}} />);
    expect(screen.queryByRole('button', { name: /full ?screen/i })).toBeNull();
  });
  it('shows fullscreen when supported; all buttons are type=button (no reload)', () => {
    render(<ControlBar showFullscreen uiHidden={false} onToggleUI={() => {}} />);
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('type')).toBe('button');
    expect(screen.getByRole('button', { name: /full ?screen/i })).toBeTruthy();
  });
  it('eye button toggles UI visibility', () => {
    const fn = vi.fn();
    render(<ControlBar showFullscreen uiHidden={false} onToggleUI={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /hide interface/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('home jumps back to the Experience Now homescreen', () => {
    render(<ControlBar showFullscreen uiHidden={false} onToggleUI={() => {}} />);
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe('/');
  });
  it('can hide home (elevation screen has none in Figma)', () => {
    render(<ControlBar showHome={false} showFullscreen uiHidden={false} onToggleUI={() => {}} />);
    expect(screen.queryByRole('link', { name: /home/i })).toBeNull();
  });
});



describe('no menu page', () => {
  it('has no /menu route and the homescreen CTA goes straight to the elevation screen', () => {
    expect(existsSync('src/app/menu')).toBe(false);
    expect(project.hero.cta.href).toBe('/elevation');
  });
});

describe('DragHint', () => {
  it('is a non-interactive label', () => {
    const { container } = render(<DragHint />);
    expect(container.querySelector('button, a, [tabindex]')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toMatch(/drag & hover/i);
  });
});

describe('AerialPanel', () => {
  it('selects floor (Floor mode) and time of day (Aerial mode) with aria-pressed', () => {
    const onChange = vi.fn();
    const { rerender } = render(<AerialPanel mode="floor" floor="10th" time="day" onChange={onChange} />);
    expect(screen.getByRole('button', { name: '10th' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '19th' }));
    expect(onChange).toHaveBeenCalledWith({ floor: '19th', time: 'day' });
    rerender(<AerialPanel mode="time" floor="10th" time="day" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /night/i }));
    expect(onChange).toHaveBeenCalledWith({ floor: '10th', time: 'night' });
  });
  it('toggle switches between the time-of-day row (Aerial) and the floor row (Floor)', () => {
    const onMode = vi.fn();
    const { rerender } = render(<AerialPanel mode="floor" onMode={onMode} floor="10th" time="day" onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /night/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /aerial/i }));
    expect(onMode).toHaveBeenCalledWith('time');
    rerender(<AerialPanel mode="time" onMode={onMode} floor="10th" time="day" onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: '6th' })).toBeNull();
    expect(screen.getByRole('button', { name: /evening/i })).toBeTruthy();
  });
});

describe('TourPanel', () => {
  it('switches rooms and toggles furniture', () => {
    const onChange = vi.fn();
    render(<TourPanel room="living" furnished onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /bedroom 2/i }));
    expect(onChange).toHaveBeenCalledWith({ room: 'bedroom2', furnished: true });
    const chair = screen.getByRole('button', { name: /furniture/i });
    expect(chair.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chair);
    expect(onChange).toHaveBeenCalledWith({ room: 'living', furnished: false });
  });
  it('has left and right arrows for the room strip', () => {
    render(<TourPanel room="living" furnished onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /previous rooms/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /next rooms/i })).toBeTruthy();
  });
});

describe('Compass', () => {
  it('shows fixed N S E W markers and rotates the radar compass towards the view heading', () => {
    const { container } = render(<Compass heading={90} />);
    expect(screen.getByRole('img', { name: /facing 90 degrees/i })).toBeTruthy();
    for (const l of ['N', 'S', 'E', 'W']) expect(document.querySelector('svg')!.innerHTML.includes(l === 'N' ? 'M204.65' : `>${l}<`)).toBe(true);
    expect((container.querySelector('[data-dial]') as HTMLElement).style.transform).toBe('rotate(90deg)');
  });
});
