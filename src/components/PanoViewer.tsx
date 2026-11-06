'use client';
import { useEffect, useRef } from 'react';
import panos from '@/data/panos.json';
import { loadView, saveView, viewFor, clampPitch, initialViewId, type View } from '@/lib/pano';

interface Props { sceneId: string; persist: boolean; lockPitchAxis: boolean }

type Api = { show: (id: string, persist: boolean, lock: boolean) => void; destroy: () => void };
type PV = { yaw(): number; pitch(): number; fov(): number; setYaw(v: number): void; setPitch(v: number): void; setFov(v: number): void; addEventListener(n: string, f: () => void): void; removeEventListener(n: string, f: () => void): void };

// Marzipano cube-map viewer with our own pointer-events controls (mouse, finger and S Pen alike; Marzipano's built-in ones ignore pen).
export default function PanoViewer({ sceneId, persist, lockPitchAxis }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const want = useRef({ sceneId, persist, lockPitchAxis });
  want.current = { sceneId, persist, lockPitchAxis };

  useEffect(() => {
    let dead = false;
    let off = () => {};
    (async () => {
      const mod = await import('marzipano');
      const M = mod.default ?? mod;
      const el = host.current;
      if (dead || !el) return;
      const viewer = new M.Viewer(el);
      viewer.controls().disable();
      let current: { scene: unknown; view: PV; stop: () => void } | null = null;

      const show = (id: string, keep: boolean, lock: boolean) => {
        const init = panos.scenes[initialViewId(id) as keyof typeof panos.scenes] as View;
        const start = viewFor(init, loadView(sessionStorage, Date.now()), keep);
        const source = M.ImageUrlSource.fromString(`/panos/${id}/{z}/{f}/{y}/{x}.webp`, { cubeMapPreviewUrl: `/panos/${id}/preview.webp` });
        const geometry = new M.CubeGeometry(panos.levels);
        const L = M.RectilinearView.limit;
        const aspect = () => (el.clientWidth ? el.clientHeight / el.clientWidth : 0);
        const floorLimit = (p: View): View => (aspect() ? clampPitch(p, init, aspect()) : p);
        const limiter = lock
          ? M.util.compose(L.resolution(panos.faceSize), floorLimit)
          : L.traditional(panos.faceSize, (100 * Math.PI) / 180, (120 * Math.PI) / 180);
        const view = new M.RectilinearView(start, limiter);
        const scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });

        let t: ReturnType<typeof setTimeout> | undefined;
        const onChange = () => {
          clearTimeout(t);
          t = setTimeout(() => saveView(sessionStorage, { yaw: view.yaw(), pitch: view.pitch(), fov: view.fov() }, Date.now()), 150);
        };
        if (keep) view.addEventListener('change', onChange);

        const prev = current;
        scene.switchTo({ transitionDuration: prev ? 600 : 0 });
        current = { scene, view, stop: () => { clearTimeout(t); view.removeEventListener('change', onChange); } };
        if (prev) setTimeout(() => { prev.stop(); viewer.destroyScene(prev.scene); }, 700);
      };

      // --- pointer controls ---
      const ptrs = new Map<number, { x: number; y: number }>();
      let vel = { x: 0, y: 0 }, raf = 0, last = 0;
      const vfovOf = (v: PV) => 2 * Math.atan(Math.tan(v.fov() / 2) * el.clientHeight / el.clientWidth);
      const rotate = (dx: number, dy: number) => {
        const v = current?.view; if (!v || !el.clientWidth) return;
        v.setYaw(v.yaw() - (dx * v.fov()) / el.clientWidth);
        v.setPitch(v.pitch() + (dy * vfovOf(v)) / el.clientHeight);
      };
      const zoom = (k: number) => { const v = current?.view; if (v) v.setFov(v.fov() * k); };
      const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
      const glide = (now: number) => {
        const dt = Math.min(now - last, 50); last = now;
        rotate(vel.x * dt, vel.y * dt);
        const f = Math.pow(0.94, dt / 16); vel = { x: vel.x * f, y: vel.y * f };
        raf = Math.hypot(vel.x, vel.y) > 0.01 ? requestAnimationFrame(glide) : 0;
      };
      const down = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        cancelAnimationFrame(raf); raf = 0; vel = { x: 0, y: 0 };
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        el.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        const before = ptrs.size === 2 ? dist() : 0;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) { const d = dist(); if (before && d) zoom(before / d); return; }
        rotate(dx, dy);
        vel = { x: 0.8 * vel.x + 0.2 * (dx / Math.max(e.timeStamp - last, 1)), y: 0.8 * vel.y + 0.2 * (dy / Math.max(e.timeStamp - last, 1)) };
        last = e.timeStamp;
      };
      const up = (e: PointerEvent) => {
        const had = ptrs.delete(e.pointerId);
        if (had && ptrs.size === 0 && Math.hypot(vel.x, vel.y) > 0.05 && performance.now() - last < 80) { last = performance.now(); raf = requestAnimationFrame(glide); }
      };
      const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.001)); };
      el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', wheel, { passive: false });
      off = () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        el.removeEventListener('wheel', wheel);
      };

      api.current = { show, destroy: () => viewer.destroy() };
      show(want.current.sceneId, want.current.persist, want.current.lockPitchAxis);
    })();
    return () => { dead = true; off(); api.current?.destroy(); api.current = null; };
  }, []);

  useEffect(() => { api.current?.show(sceneId, persist, lockPitchAxis); }, [sceneId, persist, lockPitchAxis]);

  return <div ref={host} className="pano" role="application" aria-label="360 degree aerial view. Drag to look around." />;
}
