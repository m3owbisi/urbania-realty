'use client';
import { useEffect, useState } from 'react';
import SceneFrame from './SceneFrame';
import SideMenu from './SideMenu';
import ZoomPan, { type ZoomTransform } from './ZoomPan';
import { useProject } from '@/hooks/useProject';
import type { FloorHotspot } from '@/types/project';

export default function FloorPlanScene() {
  const { floorPlan } = useProject();
  const [tabId, setTabId] = useState(floorPlan.tabs[0].id);
  const [planIdx, setPlanIdx] = useState(0); // Typical always opens on Type 1
  const [unit, setUnit] = useState<FloorHotspot | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>({ s: 1, x: 0, y: 0 });

  const tab = floorPlan.tabs.find((t) => t.id === tabId)!;
  const plan = tab.plans[Math.min(planIdx, tab.plans.length - 1)];

  useEffect(() => {
    if (!unit) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setUnit(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [unit]);

  const pickTab = (id: string) => { setTabId(id); setPlanIdx(0); setUnit(null); setTransform({ s: 1, x: 0, y: 0 }); };

  const foot = !unit && tab.plans.length > 1; // Type toggle lives in a white strip under the plan, so it never covers the key map
  const backLabel = tab.plans.length > 1 ? `${tab.label} ${plan.label}` : tab.label; // Back returns to the Type the unit was opened from
  const cardCls = foot ? 'fp-card foot' : 'fp-card';

  const zoomEl = unit ? (
    <ZoomPan
      key={`u-${unit.id}`}
      label={`${unit.label} plan`}
      onBack={() => setUnit(null)}
      backLabel={backLabel}
      initialTransform={transform.s > 1 ? transform : undefined}
      onTransformChange={setTransform}
    >
      <img className="fp-img" src={unit.src} alt={`${unit.label} floor plan`} draggable={false} />
    </ZoomPan>
  ) : (
    <ZoomPan
      key={plan.id}
      label={`${tab.label} floor plan`}
      initialTransform={transform.s > 1 ? transform : undefined}
      onTransformChange={setTransform}
    >
      <img className="fp-img" src={plan.src} alt={`${tab.label} ${plan.label} floor plan`} draggable={false} />
      {plan.hotspots.map((h) => (
        <button key={h.id} type="button" className="hotspot" style={{ left: `${h.x}%`, top: `${h.y}%` }}
          aria-label={h.label} onClick={() => setUnit(h)} onPointerDown={(e) => e.stopPropagation()}>
          <span className="hotspot-dot" aria-hidden="true" />
          <span className="hotspot-label">{h.label}</span>
        </button>
      ))}
    </ZoomPan>
  );

  return (
    <SceneFrame
      hiddenView={<div className="fp-full"><div className={cardCls}>{zoomEl}</div></div>}
      bgNode={
        <div className="fp-bg" aria-hidden="true">
          <img className="fp-blur" src={floorPlan.background} alt="" draggable={false} />
        </div>
      }
      panel={
        <>
          <SideMenu active="/floor-plan" />
          <div className="fp-stage">
            <div className={cardCls} key={unit ? `u-${unit.id}` : tab.id}>
              {zoomEl}
              {foot && (
                <div className="seg" role="group" aria-label="Plan type">
                  {tab.plans.map((p, i) => (
                    <button key={p.id} type="button" aria-pressed={i === planIdx} onClick={() => setPlanIdx(i)}>{p.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="dock" role="region" aria-label="Floor plan controls">
            <div className="dock-buttons-wrap">
              <div className="chips fp-tabs" role="group" aria-label="Floor plan selection">
                {floorPlan.tabs.map((t) => (
                  <button key={t.id} type="button" className="chip chip-floor" aria-pressed={t.id === tabId} onClick={() => pickTab(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </>
      }
    />
  );
}
