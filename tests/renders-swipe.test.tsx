import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import RenderScene from '@/components/RenderScene';

// jsdom has no PointerEvent, so clientX would be dropped
beforeAll(() => { if (!('PointerEvent' in window)) (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class extends MouseEvent {}; });

const counter = () => document.querySelector('.render-count')!.textContent;
const swipe = (dx: number, dy = 0) => {
  const bg = document.querySelector('.render-bg')!;
  fireEvent.pointerDown(bg, { clientX: 300, clientY: 200 });
  fireEvent.pointerUp(bg, { clientX: 300 + dx, clientY: 200 + dy });
};

describe('renders gallery', () => {
  it('swipe left / right and arrow keys change the render; short or vertical drags do not', () => {
    render(<RenderScene />);
    const total = counter()!.split('/')[1].trim();
    expect(counter()).toBe(`1 / ${total}`);
    swipe(-120);
    expect(counter()).toBe(`2 / ${total}`);
    swipe(120);
    expect(counter()).toBe(`1 / ${total}`);
    swipe(-20);
    swipe(-100, 120);
    expect(counter()).toBe(`1 / ${total}`);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(counter()).toBe(`2 / ${total}`);
    expect(screen.getByLabelText(/Render 2 of/)).toBeTruthy();
  });
});
