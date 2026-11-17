"use client";
import { useState } from "react";
import SceneFrame from "./SceneFrame";
import SideMenu from "./SideMenu";
import RenderPanel from "./RenderPanel";
import { useProject } from "@/hooks/useProject";

export default function RenderScene() {
  const { renders } = useProject();
  const [id, setId] = useState(renders.items[0].id);
  const cur = renders.items.find((r) => r.id === id) ?? renders.items[0];
  return (
    <SceneFrame
      background={cur.src}
      shade
      panel={
        <>
          <SideMenu active="/renders" />
          <RenderPanel current={cur.id} onChange={setId} />
        </>
      }
    />
  );
}
