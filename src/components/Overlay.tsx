'use client';
export default function RotateOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div role="alertdialog" aria-live="assertive" aria-label="Rotate your device" className="rotate-overlay">
      <p>Please rotate your device to landscape</p>
    </div>
  );
}
