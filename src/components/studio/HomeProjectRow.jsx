import React from "react";
import { MoreVertical, Music } from "lucide-react";
import { Image } from "@/components/ui/image";
import { formatSize } from "@/lib/studioTracks";
import { useStudioText } from "@/components/studio/StudioLangProvider";

/** One song on the home screen: what it is called, when it was last saved, and how much room it takes. */
export default function HomeProjectRow({ project, size = 0, archived = false, onOpen, onMenu }) {
  const { t } = useStudioText();
  const saved = project.last_saved_at || project.updated_date;
  const when = saved ? new Date(saved).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="gs-card">
      <button type="button" className="gs-card-main" onClick={onOpen}>
        <span className="gs-cover">
          {project.cover_url ? (
            <Image src={project.cover_url} alt="" className="gs-cover-img" fittingType="fill" />
          ) : (
            <Music aria-hidden="true" />
          )}
        </span>
        <span className="gs-card-text">
          <span className="gs-card-title">{project.title}</span>
          <span className="gs-card-sub">
            {project.artist ? `${project.artist} · ` : ""}
            {project.bpm} BPM · {project.key_root || "A"} {project.key_scale === "major" ? t("major") : t("minor")}
          </span>
          <span className="gs-card-meta">
            {(project.tracks || []).length} {t("tracksCount")} · {formatSize(size)}
            {when ? ` · ${t("lastSaved")} ${when}` : ""}
            {archived ? ` · ${t("archivedProjects")}` : ""}
          </span>
        </span>
      </button>
      <button type="button" className="gs-icon is-sm" onClick={onMenu} aria-label={`${project.title} — ${t("settings")}`}>
        <MoreVertical />
      </button>
    </div>
  );
}