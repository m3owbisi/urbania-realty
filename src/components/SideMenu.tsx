'use client';
import { useState } from 'react';
import ExplorePanel from './ExplorePanel';

// Every screen except 3D elevation: the menu stays hidden until the arrow is clicked.
// Tab stays anchored at the edge; clicking it rotates the arrow in place to open/collapse.
export default function SideMenu({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ExplorePanel active={active} open={open} />
      <button type="button" className="menu-tab" aria-label={open ? 'Collapse menu' : 'Open menu'}
        aria-expanded={open} data-open={open} onClick={() => setOpen((o) => !o)}>
        <span className="mask right" aria-hidden="true" />
      </button>
    </>
  );
}
