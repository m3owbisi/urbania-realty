export interface Project {
  name: string;
  brand: { projectLogo: string; partnerLogo: string; partnerLogoDark: string; watermark: { label: string; url: string } };
  hero: {
    headline: string;
    subtext: string;
    subtextLines: string[];
    background: string;
    cta: { label: string; href: string };
  };
  menu: { number: string; label: string; href: string; image: string; active: boolean }[];
  aerial: { floors: string[]; times: string[]; timeScenes: Record<string, string>; floorScenes: Record<string, string>; northBearing: number };
  tour: { background: string; rooms: { id: string; label: string }[] };
  amenities: { background: string };
  renders: { items: { id: string; label: string; src: string; portrait?: boolean }[] };
  brochure: { src: string };
  floorPlan: { background: string; tabs: FloorTab[] };
  elevation: { background: string };
}

export interface FloorHotspot { id: string; label: string; x: number; y: number; src: string }
export interface FloorPlan { id: string; label: string; src: string; hotspots: FloorHotspot[] }
export interface FloorTab { id: string; label: string; plans: FloorPlan[] }
