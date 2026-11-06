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
  aerial: { floors: string[]; times: string[]; timeScenes: Record<string, string>; floorScenes: Record<string, string> };
  tour: { background: string; rooms: { id: string; label: string }[] };
  amenities: { background: string };
  floorPlan: { background: string };
  elevation: { background: string };
}
