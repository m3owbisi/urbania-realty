import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import HeroSection from '@/components/HeroSection';
import RotateOverlay from '@/components/Overlay';
afterEach(cleanup);

describe('HeroSection', () => {
  it('renders headline as a real h1 and CTA as a link (no reload via button)', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('A Symphony Of Leisure');
    const cta = screen.getByRole('link', { name: /experience now/i });
    expect(cta.getAttribute('href')).toBe('/elevation');
  });
  it('has no fullscreen button on the homescreen and never uses native form submit', () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector('form')).toBeNull();
  });
});

describe('RotateOverlay', () => {
  it('is announced to assistive tech when visible', () => {
    render(<RotateOverlay visible />);
    expect(screen.getByRole('alertdialog').textContent).toMatch(/landscape/i);
  });
  it('renders nothing when hidden', () => {
    const { container } = render(<RotateOverlay visible={false} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('Experience Now enters fullscreen where the browser allows it', () => {
  const setup = (ua: string, enabled: boolean) => {
    const req = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
    Object.defineProperty(document, 'fullscreenEnabled', { value: enabled, configurable: true });
    document.documentElement.requestFullscreen = req;
    return req;
  };
  it('requests fullscreen on desktop/Android from the click itself (needs a user gesture)', () => {
    const req = setup('Mozilla/5.0 (Windows NT 10.0) Chrome/120', true);
    render(<HeroSection />);
    fireEvent.click(screen.getByRole('link', { name: /experience now/i }));
    expect(req).toHaveBeenCalledTimes(1);
  });
  it('does nothing on iPhone/iPad (no Fullscreen API) but still navigates normally', () => {
    const req = setup('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', true);
    render(<HeroSection />);
    fireEvent.click(screen.getByRole('link', { name: /experience now/i }));
    expect(req).not.toHaveBeenCalled();
  });
});
