import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExamAdminStudent from "@/components/exam/ExamAdminStudent";
import { useExamAdmin } from "@/lib/examAccess";
import "@/exam-admin.css";

/**
 * The admin's own list of students, one row each, with the one action that drops a student on a season:
 * the season picked and every season after it are cleared from that student's own progress and from
 * their standing on the leaderboard, so they stand on the season picked at its first episode.
 *
 * It is the admin's alone: a student is shown nothing of it, and no student's examination is changed by
 * anything but the drop an admin really makes.
 */
export default function ExamAdminReset() {
  const admin = useExamAdmin();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  const read = async () => {
    setFailed(false);
    try {
      const page = await base44.entities.ExamRecord.filter({}, { sort: "-episodes", limit: 100 });
      setRows(page?.items || []);
    } catch (err) {
      setRows([]);
      setFailed(true);
    }
  };

  useEffect(() => {
    if (!admin || !open) return;
    read();
  }, [admin, open]);

  if (!admin) return null;

  return (
    <div className="exam-admin">
      <div className="exam-admin-top">
        <span className="exam-admin-title">
          <Users aria-hidden="true" /> Student seasons — admin only
        </span>
        <button
          type="button"
          className="exam-admin-toggle"
          onClick={() => setOpen((held) => !held)}
        >
          {open ? "Hide students" : "Show students"}
        </button>
      </div>

      {open ? (
        <>
          <p className="exam-admin-note">
            Dropping a student on a season clears that season and every season after it — the episodes
            passed, the episodes closed and the attempts counted — and drops their standing on the
            leaderboard to match. They then stand on the season picked, at its first episode, and the
            seasons after it wait behind it again. An episode passed after the drop is kept.
          </p>

          {failed ? (
            <p className="exam-admin-error" role="alert">
              The students could not be read just now. Close and open this list again.
            </p>
          ) : rows === null ? (
            <p className="exam-admin-empty">Reading the students…</p>
          ) : rows.length === 0 ? (
            <p className="exam-admin-empty">No student stands on the leaderboard yet.</p>
          ) : (
            <div className="exam-admin-list">
              {rows.map((record) => (
                <ExamAdminStudent key={record.id} record={record} onDone={read} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}