import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { projectBytes } from "@/lib/studioStore";
import { defaultBuses, defaultMaster, projectDuration } from "@/lib/studioTracks";

/** Everything of a song that is worth going back to: what stands on the timeline and how it is heard. */
const HELD = [
  "title", "artist", "cover_url", "bpm", "key_root", "key_scale", "time_signature", "notes",
  "duration", "tracks", "takes", "markers", "loop_start", "loop_end", "loop_on", "buses", "master",
  "template", "storage", "archived", "trashed_at", "last_saved_at", "size_bytes",
];

function snapshot(project) {
  const held = {};
  HELD.forEach((key) => {
    held[key] = project[key];
  });
  return held;
}

/**
 * One song: opened, changed without anything being written over, saved by itself a moment after the
 * artist stops touching it, and kept with the last few steps so a move can be taken back.
 */
export default function useStudioProject(id) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [, setDepth] = useState(0);

  const live = useRef(null);
  live.current = project;
  const past = useRef([]);
  const future = useRef([]);
  const timer = useRef(0);
  const pending = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const row = await base44.entities.StudioProject.get(id);
        if (!alive) return;
        setProject({
          ...row,
          tracks: row.tracks || [],
          takes: row.takes || [],
          markers: row.markers || [],
          buses: row.buses || defaultBuses(),
          master: row.master || defaultMaster(),
        });
        setSavedAt(row.last_saved_at || row.updated_date || "");
        setError("");
        projectBytes(id)
          .then((bytes) => {
            if (alive) setProject((held) => (held ? { ...held, size_bytes: bytes } : held));
          })
          .catch(() => {});
      } catch (err) {
        if (alive) setError(err?.message || "The project could not be opened.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const persist = useCallback(async (next) => {
    if (!next?.id) return null;
    setSaving(true);
    try {
      const saved = await base44.entities.StudioProject.update(next.id, {
        ...snapshot(next),
        duration: projectDuration(next),
        last_saved_at: new Date().toISOString(),
      });
      pending.current = null;
      setSavedAt(saved?.last_saved_at || new Date().toISOString());
      setError("");
      return saved;
    } catch (err) {
      setError(err?.message || "The project could not be saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const queue = useCallback(
    (next, now = false) => {
      pending.current = next;
      window.clearTimeout(timer.current);
      if (now) {
        persist(next);
        return;
      }
      timer.current = window.setTimeout(() => {
        if (pending.current) persist(pending.current);
      }, 1100);
    },
    [persist]
  );

  /** A change to the song. Everything that is heard is written down beside it, never over it. */
  const edit = useCallback(
    (mutate, options = {}) => {
      const prev = live.current;
      if (!prev) return;
      const next = mutate(prev);
      if (!next) return;
      const withDuration = { ...next, duration: projectDuration(next) };
      if (options.history !== false) {
        past.current = [...past.current.slice(-29), snapshot(prev)];
        future.current = [];
        setDepth((count) => count + 1);
      }
      setProject(withDuration);
      queue(withDuration, !!options.now);
    },
    [queue]
  );

  const apply = useCallback(
    (state) => {
      const next = { ...live.current, ...state };
      setProject(next);
      queue(next, true);
    },
    [queue]
  );

  const undo = useCallback(() => {
    const state = past.current.pop();
    if (!state) return;
    future.current = [...future.current, snapshot(live.current)];
    setDepth((count) => count + 1);
    apply(state);
  }, [apply]);

  const redo = useCallback(() => {
    const state = future.current.pop();
    if (!state) return;
    past.current = [...past.current, snapshot(live.current)];
    setDepth((count) => count + 1);
    apply(state);
  }, [apply]);

  /** Written down at once — the moment a recording ends, or a screen is left behind. */
  const saveNow = useCallback(async () => {
    window.clearTimeout(timer.current);
    const live2 = live.current;
    if (!live2) return null;
    return persist(live2);
  }, [persist]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pending.current) persist(pending.current);
    },
    [persist]
  );

  return {
    project,
    loading,
    error,
    saving,
    savedAt,
    edit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    saveNow,
    setProject,
  };
}