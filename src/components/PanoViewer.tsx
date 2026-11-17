"use client";
import { useEffect, useRef } from "react";
import panos from "@/data/panos.json";
import project from "@/data/project.json";
import {
  getStorage,
  loadView,
  saveView,
  viewFor,
  clampPitch,
  initialViewId,
  type View,
} from "@/lib/pano";

interface Props {
  sceneId: string;
  persist?: boolean;
  lockPitchAxis?: boolean;
  isFloor?: boolean;
  onYaw?: (rad: number) => void;
}

type Api = { show: (id: string) => void; destroy: () => void };
type PV = {
  yaw(): number;
  pitch(): number;
  fov(): number;
  setYaw(v: number): void;
  setPitch(v: number): void;
  setFov(v: number): void;
  screenToCoordinates?: (
    coords: { x: number; y: number },
    result?: { yaw: number; pitch: number },
  ) => { yaw: number; pitch: number };
  addEventListener(n: string, f: () => void): void;
  removeEventListener(n: string, f: () => void): void;
};

export default function PanoViewer({
  sceneId,
  isFloor: isFloorProp,
  onYaw,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  // The viewer effect runs once; refs keep it reading the latest props (a stale isFloor kept Aerial locked to floor limits).
  const floorRef = useRef(isFloorProp);
  floorRef.current = isFloorProp;
  const yawCb = useRef(onYaw);
  yawCb.current = onYaw;
  const api = useRef<Api | null>(null);
  const currentView = useRef<View | null>(null);

  useEffect(() => {
    let dead = false;
    let off = () => {};

    (async () => {
      const mod = await import("marzipano");
      const M = (mod.default ?? mod) as {
        Viewer: new (
          el: HTMLElement,
          opts?: unknown,
        ) => {
          controls: () => { disable: () => void };
          createScene: (opts: unknown) => {
            switchTo: (opts?: { transitionDuration?: number }) => void;
          };
          destroyScene: (s: unknown) => void;
          destroy: () => void;
        };
        ImageUrlSource: {
          fromString: (
            url: string,
            opts?: { cubeMapPreviewUrl?: string },
          ) => unknown;
        };
        CubeGeometry: new (levels: unknown) => unknown;
        RectilinearView: {
          new (params: View, limiter: unknown): PV;
          limit: {
            traditional: (
              faceSize: number,
              minFov: number,
              maxFov: number,
            ) => unknown;
          };
        };
      };

      const el = host.current;
      if (dead || !el) return;

      el.style.touchAction = "none";
      const viewer = new M.Viewer(el);
      viewer.controls().disable();

      let current: {
        scene: unknown;
        view: PV;
        isFloor: boolean;
        stop: () => void;
      } | null = null;

      const show = (id: string) => {
        const isFloor =
          floorRef.current ??
          Object.values(project.aerial.floorScenes).includes(id);
        const initId = initialViewId(id);
        const init = (panos.scenes[initId as keyof typeof panos.scenes] as
          | View
          | undefined) ?? {
          yaw: 0,
          pitch: 0,
          fov: 1.5707963267948966,
        };

        const st = getStorage();
        const activeOrSaved =
          currentView.current ?? (st ? loadView(st, Date.now()) : null);
        let start = viewFor(init, activeOrSaved, true);

        const aspect =
          el.clientHeight && el.clientWidth
            ? el.clientHeight / el.clientWidth
            : 0.5625;
        if (isFloor) {
          start = clampPitch(start, init, aspect);
        }

        const source = M.ImageUrlSource.fromString(
          `/panos/${id}/{z}/{f}/{y}/{x}.webp`,
          {
            cubeMapPreviewUrl: `/panos/${id}/preview.webp`,
          },
        );
        const geometry = new M.CubeGeometry(panos.levels);

        let limiter: unknown;
        if (!isFloor) {
          limiter = M.RectilinearView.limit.traditional(
            panos.faceSize,
            (100 * Math.PI) / 180,
            (120 * Math.PI) / 180,
          );
        } else {
          limiter = (params: {
            yaw: number;
            pitch: number;
            fov: number;
            width?: number;
            height?: number;
          }) => {
            const asp =
              params.height && params.width
                ? params.height / params.width
                : aspect;
            const clamped = clampPitch(
              { yaw: params.yaw, pitch: params.pitch, fov: params.fov },
              init,
              asp,
            );
            params.fov = Math.max(0.35, clamped.fov);
            params.pitch = clamped.pitch;
            return params;
          };
        }

        const view = new M.RectilinearView(start, limiter);
        const scene = viewer.createScene({
          source,
          geometry,
          view,
          pinFirstLevel: true,
        });

        let t: ReturnType<typeof setTimeout> | undefined;
        const onChange = () => {
          currentView.current = {
            yaw: view.yaw(),
            pitch: view.pitch(),
            fov: view.fov(),
          };
          yawCb.current?.(view.yaw());
          clearTimeout(t);
          t = setTimeout(() => {
            const s = getStorage();
            if (s && currentView.current) {
              saveView(s, currentView.current, Date.now());
            }
          }, 100);
        };
        view.addEventListener("change", onChange);
        yawCb.current?.(start.yaw);

        const prev = current;
        scene.switchTo({ transitionDuration: 0 });
        current = {
          scene,
          view,
          isFloor,
          stop: () => {
            clearTimeout(t);
            view.removeEventListener("change", onChange);
          },
        };
        if (prev) {
          setTimeout(() => {
            prev.stop();
            viewer.destroyScene(prev.scene);
          }, 100);
        }
      };

      // --- Pointer controls with 1:1 rectilinear tracking for mouse, touch, and pen (S Pen/stylus) ---
      const ptrs = new Map<number, { x: number; y: number }>();
      let isPen = false;
      let vel = { x: 0, y: 0 };
      let raf = 0;
      let lastMoveTime = 0;
      let lastDist = 0;

      const rotate = (
        clientX: number,
        clientY: number,
        prevX: number,
        prevY: number,
      ) => {
        const c = current;
        const v = c?.view;
        if (!v || !el.clientHeight || !el.clientWidth) return;

        const rect = el.getBoundingClientRect();
        let dyaw = 0;
        let dpitch = 0;
        let computed = false;

        if (typeof v.screenToCoordinates === "function") {
          try {
            const p1 = { x: prevX - rect.left, y: prevY - rect.top };
            const p2 = { x: clientX - rect.left, y: clientY - rect.top };
            const c1 = v.screenToCoordinates(p1);
            const c2 = v.screenToCoordinates(p2);
            if (
              c1 &&
              c2 &&
              Number.isFinite(c1.yaw) &&
              Number.isFinite(c2.yaw)
            ) {
              dyaw = c1.yaw - c2.yaw;
              while (dyaw > Math.PI) dyaw -= 2 * Math.PI;
              while (dyaw < -Math.PI) dyaw += 2 * Math.PI;
              dpitch = c1.pitch - c2.pitch;
              computed = true;
            }
          } catch {
            computed = false;
          }
        }

        if (!computed) {
          const dx = clientX - prevX;
          const dy = clientY - prevY;
          const k = (2 * Math.tan(v.fov() / 2)) / el.clientHeight;
          const cosPitch = Math.max(0.1, Math.cos(v.pitch()));
          dyaw = -(dx * k) / cosPitch;
          dpitch = dy * k;
        }

        v.setYaw(v.yaw() + dyaw);

        if (!c.isFloor) {
          v.setPitch(v.pitch() + dpitch);
        } else {
          const base = { yaw: 0, pitch: 0, fov: 1.5707963267948966 };
          const aspect = el.clientHeight / el.clientWidth;
          const curFov = v.fov();
          if (curFov >= base.fov - 0.005) {
            v.setPitch(base.pitch);
          } else {
            const targetPitch = v.pitch() + dpitch;
            const clamped = clampPitch(
              { yaw: v.yaw(), pitch: targetPitch, fov: curFov },
              base,
              aspect,
            );
            v.setPitch(clamped.pitch);
          }
        }
      };

      const zoom = (factor: number) => {
        const c = current;
        const v = c?.view;
        if (!v || !el.clientHeight || !el.clientWidth) return;
        const baseFov = 1.5707963267948966;
        const minFov = 0.35;
        const maxFov = c.isFloor ? baseFov : (120 * Math.PI) / 180;
        const nextFov = Math.max(minFov, Math.min(maxFov, v.fov() * factor));
        v.setFov(nextFov);

        if (c.isFloor) {
          const base = { yaw: 0, pitch: 0, fov: baseFov };
          const aspect = el.clientHeight / el.clientWidth;
          const clamped = clampPitch(
            { yaw: v.yaw(), pitch: v.pitch(), fov: nextFov },
            base,
            aspect,
          );
          v.setPitch(clamped.pitch);
        }
      };

      const dist = () => {
        const [a, b] = [...ptrs.values()];
        if (!a || !b) return 0;
        return Math.hypot(a.x - b.x, a.y - b.y);
      };

      const glide = (now: number) => {
        const dt = Math.min(now - lastMoveTime, 50);
        lastMoveTime = now;
        const c = current;
        const v = c?.view;
        if (!v || !el.clientHeight || !el.clientWidth) return;
        const k = (2 * Math.tan(v.fov() / 2)) / el.clientHeight;
        const cosPitch = Math.max(0.1, Math.cos(v.pitch()));
        const dx = vel.x * dt;
        const dy = vel.y * dt;
        v.setYaw(v.yaw() - (dx * k) / cosPitch);
        if (!c.isFloor) {
          v.setPitch(v.pitch() + dy * k);
        } else if (v.fov() < 1.5707963267948966 - 0.005) {
          const base = { yaw: 0, pitch: 0, fov: 1.5707963267948966 };
          const aspect = el.clientHeight / el.clientWidth;
          const clamped = clampPitch(
            { yaw: v.yaw(), pitch: v.pitch() + dy * k, fov: v.fov() },
            base,
            aspect,
          );
          v.setPitch(clamped.pitch);
        }
        const friction = Math.pow(0.88, dt / 16);
        vel = { x: vel.x * friction, y: vel.y * friction };
        raf =
          Math.hypot(vel.x, vel.y) > 0.005 ? requestAnimationFrame(glide) : 0;
      };

      const down = (e: PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        cancelAnimationFrame(raf);
        raf = 0;
        vel = { x: 0, y: 0 };
        isPen = e.pointerType === "pen";
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) {
          lastDist = dist();
        }
        lastMoveTime = performance.now();
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      };

      const move = (e: PointerEvent) => {
        const p = ptrs.get(e.pointerId);
        if (!p) return;

        // Ignore hover movement when pen or mouse is not actively pressed
        if (
          (e.pointerType === "mouse" || e.pointerType === "pen") &&
          e.buttons === 0
        ) {
          up(e);
          return;
        }

        const now = performance.now();
        const dt = Math.max(now - lastMoveTime, 1);
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;

        if (ptrs.size === 1 && Math.hypot(dx, dy) < 0.5) {
          return;
        }

        if (ptrs.size === 2) {
          ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const d = dist();
          if (lastDist > 0 && d > 0) {
            zoom(lastDist / d);
          }
          lastDist = d;
          return;
        }

        rotate(e.clientX, e.clientY, p.x, p.y);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (e.pointerType === "touch" && !isPen) {
          vel = {
            x: 0.7 * vel.x + 0.3 * (dx / dt),
            y: 0.7 * vel.y + 0.3 * (dy / dt),
          };
        } else {
          vel = { x: 0, y: 0 };
        }
        lastMoveTime = now;
      };

      const up = (e: PointerEvent) => {
        const had = ptrs.delete(e.pointerId);
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {}
        const now = performance.now();
        if (isPen || e.pointerType !== "touch" || now - lastMoveTime > 50) {
          vel = { x: 0, y: 0 };
        } else if (had && ptrs.size === 0 && Math.hypot(vel.x, vel.y) > 0.08) {
          lastMoveTime = now;
          raf = requestAnimationFrame(glide);
        }
      };

      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom(Math.exp(e.deltaY * 0.001));
      };

      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("lostpointercapture", up);
      el.addEventListener("wheel", wheel, { passive: false });
      window.addEventListener("pointerup", up);

      off = () => {
        cancelAnimationFrame(raf);
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        el.removeEventListener("lostpointercapture", up);
        el.removeEventListener("wheel", wheel);
        window.removeEventListener("pointerup", up);
      };

      api.current = { show, destroy: () => viewer.destroy() };
      show(sceneId);
    })();

    return () => {
      dead = true;
      off();
      api.current?.destroy();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.show(sceneId);
  }, [sceneId]);

  return (
    <div
      ref={host}
      className="pano"
      role="application"
      aria-label="360 degree aerial view. Drag to look around."
    />
  );
}
