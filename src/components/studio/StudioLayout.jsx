import React from "react";
import { Outlet } from "react-router-dom";
import StudioLangProvider from "@/components/studio/StudioLangProvider";
import "@/studio.css";

/** The studio's own room: its language, its charcoal, and its screens inside it. */
export default function StudioLayout() {
  return (
    <StudioLangProvider>
      <div className="gs-root">
        <Outlet />
      </div>
    </StudioLangProvider>
  );
}