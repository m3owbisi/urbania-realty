import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import FloorPlanScene from '@/components/FloorPlanScene';

describe('floor plans', () => {
  it('opens on Typical / Type 1 with 4 unit hotspots', () => {
    render(<FloorPlanScene />);
    expect(screen.getByRole('button', { name: 'Type 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Typical' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('button', { name: /^Unit 0\d/ })).toHaveLength(4);
  });
  it('type toggle swaps units; other tabs have no type toggle or hotspots', () => {
    render(<FloorPlanScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Type 2' }));
    expect(screen.getByRole('button', { name: /Unit 01 · 1806/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Podium' }));
    expect(screen.queryByRole('button', { name: 'Type 1' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^Unit/ })).toHaveLength(0);
  });
  it('hotspot opens the unit plan; Escape returns to the typical plan', () => {
    render(<FloorPlanScene />);
    fireEvent.click(screen.getByRole('button', { name: /Unit 02 · 1862/ }));
    expect(screen.getByAltText(/Unit 02 · 1862 sq.ft. floor plan/)).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getAllByRole('button', { name: /^Unit 0\d/ })).toHaveLength(4);
  });
  it('unit plan has a Back button that returns to the Type it was opened from', () => {
    render(<FloorPlanScene />);
    fireEvent.click(screen.getByRole('button', { name: 'Type 2' }));
    fireEvent.click(screen.getByRole('button', { name: /Unit 01 · 1806/ }));
    expect(screen.queryByRole('button', { name: 'Type 2' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Typical Type 2' }));
    expect(screen.getByRole('button', { name: 'Type 2' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('button', { name: /^Unit 0\d/ })).toHaveLength(4);
  });
  it('shows a Close button once the plan is zoomed; it zooms back out', async () => {
    render(<FloorPlanScene />);
    expect(screen.queryByRole('button', { name: 'Close zoom' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Zoom in' })[0]);
    const close = await screen.findByRole('button', { name: 'Close zoom' });
    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Close zoom' })).toBeNull());
  });
});
