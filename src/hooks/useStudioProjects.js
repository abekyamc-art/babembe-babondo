import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { deleteAudio, listMeta, projectBytes } from "@/lib/studioStore";

/** The recordings a song's clips and takes point at. */
function keysOf(project) {
  const keys = new Set();
  (project?.tracks || []).forEach((track) => (track.clips || []).forEach((clip) => clip.source_key && keys.add(clip.source_key)));
  (project?.takes || []).forEach((take) => take.source_key && keys.add(take.source_key));
  return keys;
}

/**
 * Every song on this phone's account: what is being worked on, what is archived, and what waits in
 * the bin. Each song's recordings stay in the phone's own audio store, and the room they take is
 * read from the light list beside them rather than from the sound itself.
 */
export default function useStudioProjects() {
  const [projects, setProjects] = useState([]);
  const [sizes, setSizes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await base44.entities.StudioProject.filter({}, { sort: "-updated_date", limit: 100 });
      const rows = page?.items || [];
      setProjects(rows);
      setError("");
      const measured = await Promise.all(
        rows.slice(0, 40).map(async (row) => [row.id, await projectBytes(row.id).catch(() => 0)])
      );
      setSizes(Object.fromEntries(measured));
    } catch (err) {
      setError(err?.message || "The projects could not be read.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (data) => base44.entities.StudioProject.create(data), []);

  const update = useCallback(async (id, data) => base44.entities.StudioProject.update(id, data), []);

  /**
   * A copy of a song. The clips of the copy point at the very same recordings, so duplicating costs
   * no extra room on the phone — and a recording is only ever thrown away when nothing else stands
   * on it.
   */
  const duplicate = useCallback(
    async (project) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = project;
      return base44.entities.StudioProject.create({
        ...rest,
        title: `${project.title} 2`,
        archived: false,
        trashed_at: "",
        last_saved_at: new Date().toISOString(),
      });
    },
    []
  );

  const remove = useCallback(
    async (project) => {
      const keep = new Set();
      projects
        .filter((one) => one.id !== project.id)
        .forEach((one) => keysOf(one).forEach((key) => keep.add(key)));
      const rows = await listMeta(project.id).catch(() => []);
      await Promise.all(rows.filter((row) => !keep.has(row.id)).map((row) => deleteAudio(row.id).catch(() => null)));
      await base44.entities.StudioProject.delete(project.id);
      setProjects((list) => list.filter((one) => one.id !== project.id));
      setError("");
    },
    [projects]
  );

  return { projects, sizes, loading, error, reload: load, create, update, duplicate, remove };
}