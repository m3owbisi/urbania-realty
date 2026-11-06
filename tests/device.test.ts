import { isInstalledPwa, isIOS, canFullscreen, isPortraitSmallScreen } from '@/lib/device';

const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const ipadOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36';

describe('isIOS', () => {
  it('detects iPhone', () => expect(isIOS(iphone, 0)).toBe(true));
  it('detects iPadOS posing as Mac via touch points', () => expect(isIOS(ipadOS, 5)).toBe(true));
  it('is false for a real Mac and Windows', () => {
    expect(isIOS(ipadOS, 0)).toBe(false);
    expect(isIOS(chrome, 0)).toBe(false);
  });
});

describe('canFullscreen', () => {
  it('is false on iOS even if the api object exists', () =>
    expect(canFullscreen({ fullscreenEnabled: true }, true)).toBe(false));
  it('is true on desktop when enabled', () =>
    expect(canFullscreen({ fullscreenEnabled: true }, false)).toBe(true));
  it('supports the webkit prefix', () =>
    expect(canFullscreen({ webkitFullscreenEnabled: true }, false)).toBe(true));
  it('is false when unsupported', () => expect(canFullscreen({}, false)).toBe(false));
});

describe('isPortraitSmallScreen', () => {
  it('flags a phone in portrait', () => expect(isPortraitSmallScreen(375, 812)).toBe(true));
  it('does not flag landscape', () => expect(isPortraitSmallScreen(812, 375)).toBe(false));
  it('does not flag a portrait desktop monitor', () => expect(isPortraitSmallScreen(1080, 1920)).toBe(false));
});

describe('isInstalledPwa', () => {
  const win = (on: string[], standalone?: boolean) => ({ navigator: { standalone }, matchMedia: (q: string) => ({ matches: on.includes(q) }) }) as unknown as Window;
  const doc = (fs: unknown = null) => ({ fullscreenElement: fs }) as unknown as Document;
  it('true for standalone, minimal-ui, iOS home screen and manifest fullscreen', () => {
    expect(isInstalledPwa(win(['(display-mode: standalone)']), doc())).toBe(true);
    expect(isInstalledPwa(win(['(display-mode: minimal-ui)']), doc())).toBe(true);
    expect(isInstalledPwa(win([], true), doc())).toBe(true);
    expect(isInstalledPwa(win(['(display-mode: fullscreen)']), doc())).toBe(true);
  });
  it('false in a normal tab, even after the page itself went fullscreen', () => {
    expect(isInstalledPwa(win([]), doc())).toBe(false);
    expect(isInstalledPwa(win(['(display-mode: fullscreen)']), doc({}))).toBe(false);
  });
});
