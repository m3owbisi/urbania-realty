// Purely decorative hint from the Figma ("DRAG & HOVER"): not focusable, not clickable.
export default function DragHint() {
  return <div className="drag-hint" aria-hidden="true">Drag &amp; hover</div>;
}
