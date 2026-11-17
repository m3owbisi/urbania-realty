import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { readFileSync, existsSync, readdirSync } from "fs";
import project from "@/data/project.json";
import panos from "@/data/panos.json";
import {
  clampPitch,
  initialViewId,
  lockPitch,
  saveView,
  loadView,
  viewFor,
  sceneFor,
  DEFAULT_SELECTION,
  SAVE_KEY,
  TTL_MS,
} from "@/lib/pano";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import ExplorePanel from "@/components/ExplorePanel";
import Watermark from "@/components/Watermark";
import HeroSection from "@/components/HeroSection";

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.useRealTimers();
});
const sel = (c: HTMLElement) =>
  (c.querySelector("[data-selector]") as HTMLElement).style.getPropertyValue(
    "--i",
  );

describe("ExplorePanel: moving selector + inactive items", () => {
  it("live items are links; the other three are inactive and do nothing", () => {
    render(<ExplorePanel active="/elevation" />);
    expect(
      screen.getAllByRole("link").map((a) => a.getAttribute("href")),
    ).toEqual([
      "/elevation",
      "/aerial-view",
      "/renders",
      "/brochure/60-perry-cross.pdf",
    ]);
    for (const name of [/virtual tour/i, /floor plan/i, /amenities/i]) {
      const el = screen.getByText(name).closest("[aria-disabled]")!;
      expect(el.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(el);
    }
    expect(push).not.toHaveBeenCalled();
  });
  it("selector starts on the active item, follows hover over live items, and returns on leave", () => {
    const { container } = render(<ExplorePanel active="/elevation" />);
    expect(sel(container)).toBe("0");
    const list = container.querySelector("ul")!;
    fireEvent.mouseEnter(
      screen.getByRole("link", { name: /aerial view/i }).closest("li")!,
    );
    expect(sel(container)).toBe("3");
    fireEvent.mouseLeave(list);
    expect(sel(container)).toBe("0");
  });
  it("selector does not move onto inactive items", () => {
    const { container } = render(<ExplorePanel active="/elevation" />);
    fireEvent.mouseEnter(screen.getByText(/virtual tour/i).closest("li")!);
    expect(sel(container)).toBe("0");
  });
  it("clicking a live item locks the selector there and then navigates", () => {
    vi.useFakeTimers();
    const { container } = render(<ExplorePanel active="/elevation" />);
    fireEvent.click(screen.getByRole("link", { name: /aerial view/i }));
    expect(sel(container)).toBe("3");
    expect(push).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(push).toHaveBeenCalledWith("/aerial-view");
  });
});

describe("ExplorePanel numbers", () => {
  it("number colours never change on hover or click: only the active page keeps its gold number", () => {
    const { container } = render(<ExplorePanel active="/elevation" />);
    const gold = () =>
      [...container.querySelectorAll(".num.on")].map((n) => n.textContent);
    expect(gold()).toEqual(["01"]);
    fireEvent.mouseEnter(
      screen.getByRole("link", { name: /aerial view/i }).closest("li")!,
    );
    expect(gold()).toEqual(["01"]);
    fireEvent.click(screen.getByRole("link", { name: /aerial view/i }));
    expect(gold()).toEqual(["01"]);
  });
});

describe("Watermark", () => {
  it("uses the supplied The VR Company markup: safe link, role=img, svg mark + wordmark", () => {
    const { container } = render(<Watermark />);
    const a = screen.getByRole("link", {
      name: /visit the vr company website/i,
    });
    expect(a.getAttribute("href")).toBe("https://thevrcompany.in");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a.getAttribute("title")).toBe("Visit The VR Company");
    expect(
      container
        .querySelector('span.tvrc[role="img"]')
        ?.getAttribute("aria-label"),
    ).toBe("Produced by The VR Company");
    expect(
      container.querySelector("svg.tvrc__mark")?.getAttribute("viewBox"),
    ).toBe("543 247 271 143");
    expect(container.querySelector(".tvrc__word")?.textContent).toBe(
      "The VR Company",
    );
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("HeroSection copy", () => {
  it("splits the subtext into the three Figma lines", () => {
    const { container } = render(<HeroSection />);
    const lines = [...container.querySelectorAll("[data-line]")].map(
      (l) => l.textContent,
    );
    expect(lines).toEqual(project.hero.subtextLines);
    expect(project.hero.subtextLines).toHaveLength(3);
  });
});

describe("fonts + scaling", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  it("declares @font-face for Gotham and Playfair from /fonts and ships Playfair woff2", () => {
    expect(css).toMatch(/@font-face[^}]*font-family:\s*'Gotham'/);
    expect(css).toMatch(
      /@font-face[^}]*font-family:\s*'Playfair Display'[^}]*\/fonts\/PlayfairDisplay-Regular\.woff2/,
    );
    expect(existsSync("public/fonts/PlayfairDisplay-Regular.woff2")).toBe(true);
  });
  it("scales every Figma px with the viewport (rem driven by min(vw, vh)) so laptops are not oversized", () => {
    expect(css).toMatch(/html\s*\{[^}]*font-size:\s*min\(/);
  });
});

describe("polish", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const rule = (sel: string) =>
    css.match(
      new RegExp(`(?:^|\\n)${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`),
    )?.[1] ?? "";
  it("Experience Now stays on one line", () => {
    expect(rule(".cta")).toMatch(/white-space:\s*nowrap/);
    expect(rule(".cta")).not.toMatch(/(?<![-\w])width:\s*15rem/);
  });
  it("selector glide is medium paced (0.5s to 0.8s)", () => {
    const t = Number(
      css.match(/\.selector[^}]*transition:\s*translate\s+([\d.]+)s/s)?.[1],
    );
    expect(t).toBeGreaterThanOrEqual(0.5);
    expect(t).toBeLessThanOrEqual(0.8);
  });
});

describe("panorama data + assets", () => {
  it("maps day/evening/night and floors to the requested Marzipano scenes", () => {
    expect(project.aerial.timeScenes).toEqual({
      day: "0-133_0578-day-top-e1",
      evening: "1-133_0580-evening",
      night: "2-133_0591-night-e1",
    });
    expect(project.aerial.floorScenes).toEqual({
      "6th": "3-133_0585-e1",
      "10th": "4-133_0584-e1",
      "15th": "5-133_0583-e1",
      "19th": "6-133_0582-e1",
      "20th": "7-133_0581-e1",
    });
    for (const id of [
      ...Object.values(project.aerial.timeScenes),
      ...Object.values(project.aerial.floorScenes),
    ])
      expect(Object.keys(panos.scenes)).toContain(id);
  });
  it("ships tiles as webp only", () => {
    const dir = "public/panos/0-133_0578-day-top-e1";
    expect(existsSync(`${dir}/preview.webp`)).toBe(true);
    expect(readdirSync(dir)).not.toContain("preview.jpg");
  });
});

describe("pano logic", () => {
  const init = { yaw: 0.3, pitch: 0.06, fov: 1.27 };
  it("floor views lock the pitch (horizontal 360 only); yaw stays free", () => {
    const limit = lockPitch(0.05);
    expect(limit({ yaw: 3, pitch: 0.9, fov: 1.2 })).toEqual({
      yaw: 3,
      pitch: 0.05,
      fov: 1.2,
    });
    expect(limit({ yaw: -7, pitch: -0.8, fov: 1.2 }).yaw).toBe(-7);
  });
  it("floor 20th is selected by default", () => {
    expect(DEFAULT_SELECTION).toEqual({
      mode: "floor",
      floor: "20th",
      time: "day",
    });
  });
  it("time-of-day panos start at their own initial view when nothing was rotated", () => {
    expect(viewFor(init, null, true)).toEqual(init);
  });
  it("keeps the rotated yaw/pitch when switching day -> evening -> night", () => {
    const store = new Map<string, string>();
    const st = {
      setItem: (k: string, v: string) => void store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
    };
    saveView(st, { yaw: 2.2, pitch: -0.1, fov: 1.0 }, 1000);
    expect(viewFor(init, loadView(st, 2000), true)).toEqual({
      yaw: 2.2,
      pitch: -0.1,
      fov: 1.0,
    });
  });
  it("forgets the saved view after the TTL and for corrupt data", () => {
    const store = new Map<string, string>();
    const st = {
      setItem: (k: string, v: string) => void store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
    };
    saveView(st, { yaw: 1, pitch: 0, fov: 1 }, 0);
    expect(loadView(st, TTL_MS + 1)).toBeNull();
    store.set(SAVE_KEY, "{nope");
    expect(loadView(st, 5)).toBeNull();
  });
  it("floors sync and persist the saved view; panos are free 360 both ways", () => {
    expect(viewFor(init, { yaw: 9, pitch: 9, fov: 1 }, false)).toEqual(init);
    expect(sceneFor({ mode: "floor", floor: "15th", time: "day" })).toEqual({
      id: "5-133_0583-e1",
      persist: true,
      lockPitch: false,
    });
    expect(sceneFor({ mode: "time", floor: "15th", time: "night" })).toEqual({
      id: "2-133_0591-night-e1",
      persist: true,
      lockPitch: false,
    });
  });
});

describe("floor pitch band and initial views", () => {
  const base = { yaw: 1, pitch: 0.05, fov: 1.2 };
  it("pins pitch at the initial zoom, frees it only by the zoomed-in spare", () => {
    expect(clampPitch({ ...base, pitch: 0.4 }, base, 0.56).pitch).toBeCloseTo(
      0.05,
    );
    const z = clampPitch({ ...base, fov: 0.6, pitch: 5 }, base, 0.56);
    expect(z.pitch).toBeGreaterThan(0.05);
    expect(z.pitch + Math.atan(Math.tan(0.3) * 0.56)).toBeCloseTo(
      0.05 + Math.atan(Math.tan(0.6) * 0.56),
      5,
    );
  });
  it("never zooms out past the initial fov, leaves yaw alone", () => {
    const r = clampPitch({ yaw: 9, pitch: 0.05, fov: 2 }, base, 0.56);
    expect(r.fov).toBe(1.2);
    expect(r.yaw).toBe(9);
  });
  it("day, evening and night open at the day preset view; floors are unchanged", () => {
    expect(initialViewId("0-133_0578-day-top-e1")).toBe(
      "0-133_0578-day-top-e1",
    );
    expect(initialViewId("1-133_0580-evening")).toBe("0-133_0578-day-top-e1");
    expect(initialViewId("2-133_0591-night-e1")).toBe("0-133_0578-day-top-e1");
    expect(initialViewId("7-133_0581-e1")).toBe("7-133_0581-e1");
  });
});
