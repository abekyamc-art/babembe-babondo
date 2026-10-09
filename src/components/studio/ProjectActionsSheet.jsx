import React from "react";
import { Archive, Copy, FolderOpen, RotateCcw, Trash2 } from "lucide-react";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";

/** What can be done with a song without opening it: copied, set aside, put in the bin — or brought back. */
export default function ProjectActionsSheet({ project, onClose, onOpen, onDuplicate, onArchive, onTrash, onRestore, onPurge }) {
  const { t } = useStudioText();
  if (!project) return null;
  const gone = !!project.trashed_at;

  return (
    <StudioSheet open onClose={onClose} title={project.title}>
      {gone ? (
        <>
          <button type="button" className="gs-btn is-wide" onClick={onRestore}>
            <RotateCcw aria-hidden="true" /> {t("restore")}
          </button>
          <button type="button" className="gs-btn is-wide is-danger" onClick={onPurge}>
            <Trash2 aria-hidden="true" /> {t("delete")}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="gs-btn is-wide is-primary" onClick={onOpen}>
            <FolderOpen aria-hidden="true" /> {t("open")}
          </button>
          <button type="button" className="gs-btn is-wide" onClick={onDuplicate}>
            <Copy aria-hidden="true" /> {t("duplicate")}
          </button>
          <button type="button" className="gs-btn is-wide" onClick={onArchive}>
            <Archive aria-hidden="true" /> {project.archived ? t("unarchive") : t("archive")}
          </button>
          <button type="button" className="gs-btn is-wide is-danger" onClick={onTrash}>
            <Trash2 aria-hidden="true" /> {t("delete")}
          </button>
        </>
      )}
    </StudioSheet>
  );
}