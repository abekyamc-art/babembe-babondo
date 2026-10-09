import { useCallback, useState } from "react";
import { STEPS, emptyRow, filledSteps, renderGrid, rowsFor, styleLabel } from "@/lib/beatGrid";
import { instrumentOf } from "@/lib/instruments";
import { saveBlob, slug } from "@/lib/rapLines";
import { wavBlob } from "@/lib/rapAudio";

/**
 * The beat, built by hand or asked for.
 *
 * The grid is sixteen steps to the bar and one row for each instrument: a kit is laid out at once
 * when a style is picked, and every step can then be moved by hand — a row added, a step turned on
 * or off, a row turned up or down. What the grid holds is played out on the phone into one sound,
 * which the studio then uses as its beat.
 */
export default function useBeatMaker({ bpm, onUse }) {
  const [rows, setRows] = useState(() => rowsFor("afro"));
  const [style, setStyle] = useState("afro");
  const [rootPc, setRootPc] = useState(9);
  const [bars, setBars] = useState(2);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  /** The automatic setting: a whole kit for the style, ready to be changed by hand. */
  const buildKit = useCallback((next) => {
    setStyle(next);
    setRows(rowsFor(next));
    setError("");
    setNote(`Kit ya ${styleLabel(next)} imewekwa — gusa hatua kubadilisha.`);
  }, []);

  const toggle = useCallback((rowId, step) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const steps = row.steps.slice();
        steps[step] = !steps[step];
        return { ...row, steps };
      })
    );
  }, []);

  const addRow = useCallback((instrument) => {
    setRows((prev) => {
      if (prev.some((row) => row.instrument === instrument)) return prev;
      return [...prev, emptyRow(instrument)];
    });
  }, []);

  const removeRow = useCallback((rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const setVolume = useCallback((rowId, volume) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, volume } : row)));
  }, []);

  const clearGrid = useCallback(() => {
    setRows((prev) => prev.map((row) => ({ ...row, steps: new Array(STEPS).fill(false) })));
    setNote("Grid imefutwa — anza upya.");
  }, []);

  /** The grid played out and handed to the studio as its beat, kept with the saved beats. */
  const useBeat = useCallback(async () => {
    if (busy || !onUse) return;
    if (!filledSteps(rows)) {
      setError("Grid haina hatua yoyote — weka angalau moja kwanza.");
      return;
    }
    setBusy("render");
    setError("");
    setNote("");
    try {
      const buffer = await renderGrid({ rows, bpm, bars, rootPc });
      const bytes = await wavBlob(buffer).arrayBuffer();
      const name = `${styleLabel(style)} · ${bpm} BPM`;
      await onUse({ bytes, name, bpm, style, seconds: buffer.duration });
      setNote(`${name} imewekwa kwenye timeline na kuhifadhiwa.`);
    } catch (err) {
      setError("Beat haikuweza kutengenezwa. Jaribu tena.");
    }
    setBusy("");
  }, [bars, bpm, busy, onUse, rootPc, rows, style]);

  /** The same beat as a file of its own, so it can be kept outside the app. */
  const download = useCallback(async () => {
    setBusy("render");
    try {
      const buffer = await renderGrid({ rows, bpm, bars, rootPc });
      saveBlob(wavBlob(buffer), `${slug(`${styleLabel(style)}-${bpm}bpm`)}.wav`);
    } catch (err) {
      setError("Beat haikuweza kuandaliwa. Jaribu tena.");
    }
    setBusy("");
  }, [bars, bpm, rootPc, rows, style]);

  return {
    rows,
    style,
    rootPc,
    bars,
    busy,
    error,
    note,
    filled: filledSteps(rows),
    instruments: rows.map((row) => instrumentOf(row.instrument)),
    setRootPc,
    setBars,
    buildKit,
    toggle,
    addRow,
    removeRow,
    setVolume,
    clearGrid,
    useBeat,
    download,
  };
}