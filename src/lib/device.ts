export const isIOS = (ua: string, maxTouchPoints: number): boolean =>
  /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);

type FsDoc = { fullscreenEnabled?: boolean; webkitFullscreenEnabled?: boolean };

// iOS Safari has no usable Fullscreen API for pages, so the button must be hidden there.
export const canFullscreen = (doc: FsDoc, ios: boolean): boolean =>
  !ios && Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);

// "Small" = phone/tablet width; a portrait desktop monitor is not asked to rotate.
export const isPortraitSmallScreen = (w: number, h: number): boolean => h > w && w < 820;

// Installed PWA (standalone / minimal-ui / iOS home screen / manifest "fullscreen"). In a browser tab that went fullscreen
// via requestFullscreen, document.fullscreenElement is set, so that case is not mistaken for an install.
export const isInstalledPwa = (win: Window, doc: Document): boolean => {
  const mm = (q: string) => win.matchMedia?.(q).matches ?? false;
  return (win.navigator as Navigator & { standalone?: boolean }).standalone === true || mm('(display-mode: standalone)') ||
    mm('(display-mode: minimal-ui)') || (mm('(display-mode: fullscreen)') && !doc.fullscreenElement);
};
