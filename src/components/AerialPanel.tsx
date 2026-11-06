'use client';
import { useProject } from '@/hooks/useProject';

interface Props { mode?: 'time' | 'floor'; onMode?: (m: 'time' | 'floor') => void; floor: string; time: string; onChange: (v: { floor: string; time: string }) => void; onFloor?: (f: string) => void; onTime?: (t: string) => void }

const s = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const icons: Record<string, React.ReactNode> = {
  day: <svg {...s}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>,
  evening: <svg {...s}><path d="M7 17a5 5 0 0110 0M12 6V3M3 17h18M5 10l2 2M19 10l-2 2M2 21h20" /></svg>,
  night: <svg {...s}><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></svg>,
};
export default function AerialPanel({ mode = 'floor', onMode, floor, time, onChange, onFloor, onTime }: Props) {
  const { aerial } = useProject();
  return (
    <div className="dock">
      <div className="seg" role="group" aria-label="View type">
        {(['time', 'floor'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={m === mode} onClick={() => onMode?.(m)}>{m === 'time' ? 'Aerial' : 'Floor'}</button>
        ))}
      </div>
      <section className="panel aerial" aria-label={mode === 'time' ? 'Aerial time of day' : 'Floor views'}>
        {mode === 'floor' ? (
          <div className="chips floors">
            {aerial.floors.map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={f === floor}
                onClick={() => { onFloor?.(f); onChange({ floor: f, time }); }}>{f}</button>
            ))}
          </div>
        ) : (
          <div className="chips times">
            {aerial.times.map((t) => (
              <button key={t} type="button" className="chip time" aria-pressed={t === time}
                onClick={() => { onTime?.(t); onChange({ floor, time: t }); }}>{icons[t]}<span>{t}</span></button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
