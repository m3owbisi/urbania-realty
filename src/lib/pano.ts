import project from '@/data/project.json';

export interface View { yaw: number; pitch: number; fov: number }
export type Selection = { mode: 'floor' | 'time'; floor: string; time: string };
export const DEFAULT_SELECTION: Selection = { mode: 'floor', floor: '20th', time: 'day' };

export const SAVE_KEY = 'urbania.aerial.view';
export const TTL_MS = 30 * 60 * 1000;

export const initialViewId = (id: string): string =>
  id === project.aerial.timeScenes.day || id === project.aerial.timeScenes.evening || id === project.aerial.timeScenes.night
    ? project.aerial.timeScenes.day
    : id;

export const clampPitch = (p: View, base: View, aspect: number): View => {
  const vfov = (f: number) => 2 * Math.atan(Math.tan(f / 2) * aspect);
  const fov = Math.min(p.fov, base.fov);
  const half = Math.max(0, (vfov(base.fov) - vfov(fov)) / 2);
  return { ...p, fov, pitch: Math.min(base.pitch + half, Math.max(base.pitch - half, p.pitch)) };
};

export const lockPitch = (pitch: number) => (params: View): View => ({ ...params, pitch });

export const saveView = (storage: Pick<Storage, 'setItem'>, v: View, now: number) => {
  try { storage.setItem(SAVE_KEY, JSON.stringify({ ...v, t: now })); } catch { /* storage full/blocked */ }
};

export const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const k = '__test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return window.localStorage;
    }
  } catch {}
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {}
  return null;
};

export const loadView = (storage: Pick<Storage, 'getItem'>, now: number): View | null => {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as View & { t: number };
    if (![v.yaw, v.pitch, v.fov, v.t].every(Number.isFinite) || now - v.t > TTL_MS) return null;
    return { yaw: v.yaw, pitch: v.pitch, fov: v.fov };
  } catch { return null; }
};

export const viewFor = (initial: View, saved: View | null, persist: boolean = true): View =>
  persist && saved ? saved : initial;

export const sceneFor = (s: Selection): { id: string; persist: boolean; lockPitch: boolean } =>
  s.mode === 'time'
    ? { id: project.aerial.timeScenes[s.time as keyof typeof project.aerial.timeScenes], persist: true, lockPitch: false }
    : { id: project.aerial.floorScenes[s.floor as keyof typeof project.aerial.floorScenes], persist: true, lockPitch: false };
