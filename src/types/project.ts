export interface Project {
  name: string;
  brand: {
    projectLogo: string;
    partnerLogo: string;
    partnerLogoDark: string;
    watermark: { label: string; url: string };
  };
  hero: {
    headline: string;
    subtext: string;
    subtextLines: string[];
    background: string;
    cta: { label: string; href: string };
  };
  menu: {
    number: string;
    label: string;
    href: string;
    image: string;
    active: boolean;
    external?: boolean;
  }[];
  aerial: {
    floors: string[];
    times: string[];
    timeScenes: Record<string, string>;
    floorScenes: Record<string, string>;
    northBearing: number;
  };
  tour: { background: string; rooms: { id: string; label: string }[] };
  amenities: { background: string };
  renders: { items: { id: string; label: string; src: string }[] };
  floorPlan: { background: string };
  elevation: { background: string };
}
