"use client";
import { useState } from "react";
import SceneFrame from "./SceneFrame";
import AerialPanel from "./AerialPanel";
import PanoViewer from "./PanoViewer";
import SideMenu from "./SideMenu";
import Compass from "./Compass";
import project from "@/data/project.json";
import {
  sceneFor,
  headingFor,
  DEFAULT_SELECTION,
  type Selection,
} from "@/lib/pano";

export default function AerialScene() {
  const [s, setS] = useState<Selection>(DEFAULT_SELECTION);
  const [yaw, setYaw] = useState(0);
  const scene = sceneFor(s);
  return (
    <SceneFrame
      bgNode={
        <PanoViewer
          sceneId={scene.id}
          persist={scene.persist}
          lockPitchAxis={scene.lockPitch}
          isFloor={s.mode === "floor"}
          onYaw={setYaw}
        />
      }
      panel={
        <>
          <SideMenu active="/aerial-view" />
          <AerialPanel
            mode={s.mode}
            onMode={(mode) => setS((p) => ({ ...p, mode }))}
            floor={s.floor}
            time={s.time}
            onChange={(v) => setS((p) => ({ ...p, ...v }))}
            onFloor={(floor) => setS((p) => ({ ...p, mode: "floor", floor }))}
            onTime={(time) => setS((p) => ({ ...p, mode: "time", time }))}
          />
        </>
      }
    >
      <Compass heading={headingFor(yaw, project.aerial.northBearing)} />
    </SceneFrame>
  );
}
