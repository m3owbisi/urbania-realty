import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import project from '@/data/project.json';
import panos from '@/data/panos.json';
import {
  clampPitch,
  initialViewId,
  lockPitch,
  saveView,
  loadView,
  viewFor,
  sceneFor,
  getStorage,
  DEFAULT_SELECTION,
  SAVE_KEY,
  TTL_MS,
  type View,
} from '@/lib/pano';
import AerialPanel from '@/components/AerialPanel';
import ControlBar from '@/components/ControlBar';
import { canFullscreen, isInstalledPwa } from '@/lib/device';

afterEach(cleanup);

describe('MASTER SPECIFICATION: Section 1 & 2 - View Architecture, Assets & Mapping', () => {
  it('maps Day, Evening, Night to exact supplied assets', () => {
    expect(project.aerial.timeScenes.day).toBe('0-133_0578-day-top-e1');
    expect(project.aerial.timeScenes.evening).toBe('1-133_0580-evening');
    expect(project.aerial.timeScenes.night).toBe('2-133_0591-night-e1');

    expect(panos.scenes['0-133_0578-day-top-e1' as keyof typeof panos.scenes].name).toBe('133_0578 Day Top E1');
    expect(panos.scenes['1-133_0580-evening' as keyof typeof panos.scenes].name).toBe('133_0580 Evening');
    expect(panos.scenes['2-133_0591-night-e1' as keyof typeof panos.scenes].name).toBe('133_0591 Night E1');
  });

  it('maps 6th, 10th, 15th, 19th, 20th floors to exact supplied assets', () => {
    expect(project.aerial.floorScenes['6th']).toBe('3-133_0585-e1');
    expect(project.aerial.floorScenes['10th']).toBe('4-133_0584-e1');
    expect(project.aerial.floorScenes['15th']).toBe('5-133_0583-e1');
    expect(project.aerial.floorScenes['19th']).toBe('6-133_0582-e1');
    expect(project.aerial.floorScenes['20th']).toBe('7-133_0581-e1');

    expect(panos.scenes['3-133_0585-e1' as keyof typeof panos.scenes].name).toBe('133_0585 E1');
    expect(panos.scenes['4-133_0584-e1' as keyof typeof panos.scenes].name).toBe('133_0584 E1');
    expect(panos.scenes['5-133_0583-e1' as keyof typeof panos.scenes].name).toBe('133_0583 E1');
    expect(panos.scenes['6-133_0582-e1' as keyof typeof panos.scenes].name).toBe('133_0582 E1');
    expect(panos.scenes['7-133_0581-e1' as keyof typeof panos.scenes].name).toBe('133_0581 E1');
  });

  it('Day and 20th Floor are selected by default', () => {
    expect(DEFAULT_SELECTION).toEqual({ mode: 'floor', floor: '20th', time: 'day' });
  });

  it('retains the supplied initial view values (yaw: 0, pitch: 0, fov: Math.PI / 2)', () => {
    for (const id of [...Object.values(project.aerial.timeScenes), ...Object.values(project.aerial.floorScenes)]) {
      const s = panos.scenes[id as keyof typeof panos.scenes];
      expect(s.yaw).toBe(0);
      expect(s.pitch).toBe(0);
      expect(s.fov).toBeCloseTo(Math.PI / 2, 5);
    }
  });
});

describe('MASTER SPECIFICATION: Section 3 - Aerial View Camera Behaviour & State Synchronisation', () => {
  it('Day, Evening, and Night all initially use the Day preset initial view when no saved state exists', () => {
    const dayId = project.aerial.timeScenes.day;
    expect(initialViewId(project.aerial.timeScenes.day)).toBe(dayId);
    expect(initialViewId(project.aerial.timeScenes.evening)).toBe(dayId);
    expect(initialViewId(project.aerial.timeScenes.night)).toBe(dayId);
  });

  it('camera state synchronisation persists yaw, pitch, and FOV across scene changes', () => {
    const store = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
    };
    const rotatedView: View = { yaw: 1.45, pitch: -0.22, fov: 1.15 };
    const now = 100000;
    saveView(storage, rotatedView, now);

    // Switching to Night retains the rotated position
    const loaded = loadView(storage, now + 5000);
    expect(loaded).toEqual(rotatedView);

    const dayInit = panos.scenes[project.aerial.timeScenes.day as keyof typeof panos.scenes];
    expect(viewFor(dayInit, loaded, true)).toEqual(rotatedView);
  });

  it('expires saved camera state after 30 minutes (TTL) and resets to initial view', () => {
    const store = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
    };
    saveView(storage, { yaw: 2.1, pitch: 0.3, fov: 1.0 }, 1000);
    expect(loadView(storage, 1000 + TTL_MS)).not.toBeNull();
    expect(loadView(storage, 1000 + TTL_MS + 1)).toBeNull();

    const dayInit = panos.scenes[project.aerial.timeScenes.day as keyof typeof panos.scenes];
    expect(viewFor(dayInit, loadView(storage, 1000 + TTL_MS + 1), true)).toEqual(dayInit);
  });

  it('switching from Aerial to Window/Floor views preserves camera position', () => {
    const rotatedAerial: View = { yaw: 2.5, pitch: 0, fov: 1.57 };
    const floor15th = panos.scenes[project.aerial.floorScenes['15th'] as keyof typeof panos.scenes];
    const applied = viewFor(floor15th, rotatedAerial, true);
    expect(applied).toEqual(rotatedAerial);
  });
});

describe('MASTER SPECIFICATION: Section 4 - Floor / Window View Camera Behaviour', () => {
  const baseFloorView: View = { yaw: 0, pitch: 0, fov: 1.5707963267948966 };
  const aspect = 1080 / 1920; // 0.5625

  it('locks vertical rotation at base zoom level', () => {
    // Attempting to pitch up or down at base zoom level stays locked to base.pitch (0)
    const pitchedUp = clampPitch({ yaw: 1.2, pitch: 0.5, fov: baseFloorView.fov }, baseFloorView, aspect);
    expect(pitchedUp.pitch).toBeCloseTo(0, 5);

    const pitchedDown = clampPitch({ yaw: -2.3, pitch: -0.6, fov: baseFloorView.fov }, baseFloorView, aspect);
    expect(pitchedDown.pitch).toBeCloseTo(0, 5);
  });

  it('allows controlled vertical movement when zoomed in, within safe visible range', () => {
    const zoomedFov = 0.8; // zoomed in
    const zoomed = clampPitch({ yaw: 0.5, pitch: 0.2, fov: zoomedFov }, baseFloorView, aspect);
    expect(zoomed.pitch).toBeGreaterThan(0);
    expect(zoomed.pitch).toBeCloseTo(0.2, 5);

    // Beyond permitted boundary, it clamps without jump
    const extremePitch = clampPitch({ yaw: 0.5, pitch: 2.5, fov: zoomedFov }, baseFloorView, aspect);
    const vfov = (f: number) => 2 * Math.atan(Math.tan(f / 2) * aspect);
    const maxHalf = (vfov(baseFloorView.fov) - vfov(zoomedFov)) / 2;
    expect(extremePitch.pitch).toBeCloseTo(maxHalf, 5);
  });

  it('does not permit zooming out beyond the configured initial FOV', () => {
    const attemptedZoomOut = clampPitch({ yaw: 0, pitch: 0, fov: 2.5 }, baseFloorView, aspect);
    expect(attemptedZoomOut.fov).toBe(baseFloorView.fov);
  });

  it('supports full 360 degree horizontal yaw rotation without restriction', () => {
    for (const yaw of [-10, -Math.PI, 0, Math.PI, 7.5, 20]) {
      const res = clampPitch({ yaw, pitch: 0, fov: baseFloorView.fov }, baseFloorView, aspect);
      expect(res.yaw).toBe(yaw);
    }
  });

  it('switching floors carries over camera state and aerial state into floor mode', () => {
    const userState: View = { yaw: 3.14, pitch: 0.02, fov: 1.2 };
    const floor6th = panos.scenes[project.aerial.floorScenes['6th'] as keyof typeof panos.scenes];
    expect(viewFor(floor6th, userState, true)).toEqual(userState);
  });
});

describe('MASTER SPECIFICATION: Section 7 - Aerial / Floor Toggle and Control Panel', () => {
  it('displays Aerial time buttons (Day, Evening, Night) with correct active states and labels', () => {
    const onChange = vi.fn();
    const onTime = vi.fn();
    render(
      <AerialPanel
        mode="time"
        floor="20th"
        time="day"
        onChange={onChange}
        onTime={onTime}
      />
    );

    const dayBtn = screen.getByRole('button', { name: /day/i });
    const eveBtn = screen.getByRole('button', { name: /evening/i });
    const nightBtn = screen.getByRole('button', { name: /night/i });

    expect(dayBtn.getAttribute('aria-pressed')).toBe('true');
    expect(eveBtn.getAttribute('aria-pressed')).toBe('false');
    expect(nightBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(eveBtn);
    expect(onTime).toHaveBeenCalledWith('evening');
    expect(onChange).toHaveBeenCalledWith({ floor: '20th', time: 'evening' });
  });

  it('displays Floor buttons (6th, 10th, 15th, 19th, 20th) with correct active states and labels', () => {
    const onChange = vi.fn();
    const onFloor = vi.fn();
    render(
      <AerialPanel
        mode="floor"
        floor="20th"
        time="day"
        onChange={onChange}
        onFloor={onFloor}
      />
    );

    for (const f of ['6th', '10th', '15th', '19th', '20th']) {
      const btn = screen.getByRole('button', { name: f });
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('aria-pressed')).toBe(f === '20th' ? 'true' : 'false');
    }

    fireEvent.click(screen.getByRole('button', { name: '15th' }));
    expect(onFloor).toHaveBeenCalledWith('15th');
    expect(onChange).toHaveBeenCalledWith({ floor: '15th', time: 'day' });
  });

  it('switches between Aerial and Floor views seamlessly via the mode toggle', () => {
    const onMode = vi.fn();
    const { rerender } = render(
      <AerialPanel mode="floor" floor="20th" time="day" onChange={() => {}} onMode={onMode} />
    );

    expect(screen.queryByRole('button', { name: /day/i })).toBeNull();
    expect(screen.getByRole('button', { name: '20th' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /aerial/i }));
    expect(onMode).toHaveBeenCalledWith('time');

    rerender(<AerialPanel mode="time" floor="20th" time="day" onChange={() => {}} onMode={onMode} />);
    expect(screen.getByRole('button', { name: /day/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '20th' })).toBeNull();
  });
});

describe('MASTER SPECIFICATION: Section 8 - Fullscreen and PWA Behaviour', () => {
  it('installed PWA hides the fullscreen-entry button', () => {
    const mockWin = { matchMedia: () => ({ matches: true }), navigator: { standalone: false } } as unknown as Window;
    const mockDoc = { fullscreenElement: null, fullscreenEnabled: true } as unknown as Document;
    expect(isInstalledPwa(mockWin, mockDoc)).toBe(true);

    // In installed PWA, showFullscreen is false
    const showFs = !isInstalledPwa(mockWin, mockDoc) && canFullscreen(mockDoc, false);
    expect(showFs).toBe(false);

    render(<ControlBar showFullscreen={showFs} uiHidden={false} onToggleUI={() => {}} />);
    expect(screen.queryByRole('button', { name: /full ?screen/i })).toBeNull();
  });

  it('normal browser tab keeps fullscreen button available and toggles exit/enter state', () => {
    const mockWin = { matchMedia: () => ({ matches: false }), navigator: { standalone: false } } as unknown as Window;
    const mockDoc = { fullscreenElement: null, fullscreenEnabled: true } as unknown as Document;
    expect(isInstalledPwa(mockWin, mockDoc)).toBe(false);

    const showFs = !isInstalledPwa(mockWin, mockDoc) && canFullscreen(mockDoc, false);
    expect(showFs).toBe(true);

    const { rerender } = render(
      <ControlBar showFullscreen={showFs} isFullscreen={false} uiHidden={false} onToggleUI={() => {}} />
    );
    expect(screen.getByRole('button', { name: /enter fullscreen/i })).toBeTruthy();

    rerender(
      <ControlBar showFullscreen={showFs} isFullscreen={true} uiHidden={false} onToggleUI={() => {}} />
    );
    expect(screen.getByRole('button', { name: /exit fullscreen/i })).toBeTruthy();
  });
});

