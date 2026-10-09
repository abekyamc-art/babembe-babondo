import React from "react";
import { TEMPOS } from "@/lib/rapBeat";
import StudioPills from "@/components/rap/StudioPills";

/** The tempo the take runs at, set from the timeline's own head. */
export default function RapTempo({ bpm, busy, onPick }) {
  return (
    <StudioPills
      options={TEMPOS.map((value) => ({ id: value, label: String(value) }))}
      value={bpm}
      busy={busy}
      onPick={(value) => onPick(Number(value))}
    />
  );
}