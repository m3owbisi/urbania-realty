import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { existsSync } from "fs";
import project from "@/data/project.json";
import RenderPanel from "@/components/RenderPanel";
import ExplorePanel from "@/components/ExplorePanel";
import { headingFor } from "@/lib/pano";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

describe("renders", () => {
  it("every render and the brochure exist on disk; renders are WebP", () => {
    for (const r of project.renders.items) {
      expect(r.src.endsWith(".webp")).toBe(true);
      expect(existsSync(`public${r.src}`)).toBe(true);
    }
    expect(existsSync("public/brochure/60-perry-cross.pdf")).toBe(true);
    expect(existsSync("src/app/renders/page.tsx")).toBe(true);
  });
  it("pill strip selects a render and never submits a form", () => {
    const fn = vi.fn();
    render(<RenderPanel current="reception" onChange={fn} />);
    expect(
      screen
        .getByRole("button", { name: "Reception" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Gym 2" }));
    expect(fn).toHaveBeenCalledWith("gym-2");
    for (const b of screen.getAllByRole("button"))
      expect(b.getAttribute("type")).toBe("button");
  });
});

describe("explore menu", () => {
  it("Renders is a menu route; Brochure opens the PDF in a new tab", () => {
    render(<ExplorePanel active="/renders" />);
    expect(
      screen.getByRole("link", { name: /renders/i }).getAttribute("href"),
    ).toBe("/renders");
    const b = screen.getByRole("link", { name: /brochure/i });
    expect(b.getAttribute("href")).toBe("/brochure/60-perry-cross.pdf");
    expect(b.getAttribute("target")).toBe("_blank");
  });
});

describe("compass heading", () => {
  it("adds the north bearing to the view yaw and wraps to 0-360", () => {
    expect(headingFor(0, 0)).toBe(0);
    expect(headingFor(Math.PI / 2, 0)).toBeCloseTo(90);
    expect(headingFor(-Math.PI / 2, 0)).toBeCloseTo(270);
    expect(headingFor(0, 30)).toBe(30);
  });
});

// Regression: Aerial used to stay locked to floor limits after switching from Floor (stale isFloor in the one-shot effect).
describe("PanoViewer Aerial after Floor", () => {
  it("uses the free aerial limiter (not the floor pitch clamp) once isFloor turns false", async () => {
    const traditional = vi.fn(() => "aerial-limiter");
    const limiters: unknown[] = [];
    vi.doMock("marzipano", () => {
      class RectilinearView {
        static limit = { traditional };
        constructor(_p: unknown, limiter: unknown) {
          limiters.push(limiter);
        }
        yaw() {
          return 0;
        }
        pitch() {
          return 0;
        }
        fov() {
          return 1.57;
        }
        setYaw() {}
        setPitch() {}
        setFov() {}
        addEventListener() {}
        removeEventListener() {}
      }
      class Viewer {
        controls() {
          return { disable() {} };
        }
        createScene() {
          return { switchTo() {} };
        }
        destroyScene() {}
        destroy() {}
      }
      const ImageUrlSource = { fromString: () => ({}) };
      class CubeGeometry {}
      return {
        default: { Viewer, RectilinearView, ImageUrlSource, CubeGeometry },
      };
    });
    const { default: PanoViewer } = await import("@/components/PanoViewer");
    const { rerender } = render(
      <PanoViewer sceneId={project.aerial.floorScenes["20th"]} isFloor />,
    );
    await waitFor(() => expect(limiters.length).toBe(1));
    expect(traditional).not.toHaveBeenCalled();
    rerender(
      <PanoViewer sceneId={project.aerial.timeScenes.day} isFloor={false} />,
    );
    await waitFor(() => expect(limiters.length).toBe(2));
    expect(traditional).toHaveBeenCalledTimes(1);
    expect(limiters[1]).toBe("aerial-limiter");
  });
});
