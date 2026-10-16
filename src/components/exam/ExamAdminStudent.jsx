import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { EXAM_SEASONS } from "@/lib/examSeasons";
import PickSheet from "@/components/knowledge/PickSheet";

/**
 * One student in the admin's own list: who they are, where they stand now, the season they are to be
 * dropped on, and the one action that drops them there.
 *
 * The drop is asked for once more before it is made — the first tap names the season, the second makes
 * the drop — because nothing of the seasons cleared can be brought back by the app itself.
 */
export default function ExamAdminStudent({ record, onDone }) {
  const [season, setSeason] = useState(Number(record.season) || 1);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const drop = async () => {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const res = await base44.functions.invoke("adminSeasonReset", {
        email: record.user_email,
        season: Number(season),
      });
      const out = res?.data || {};
      if (out.error) throw new Error(out.error);
      setDone(
        `Dropped on season ${out.season} — ${out.passed} examination episodes and ${out.episodes} episodes in all now stand for them.`
      );
      setAsk(false);
      onDone();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || "The drop could not be made. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exam-admin-row">
      <span className="exam-admin-body">
        <span className="exam-admin-name">{record.username || record.user_email}</span>
        <span className="exam-admin-meta">
          {record.user_email} · stands on season {record.season || 1}, episode {record.episode || 1} ·{" "}
          {record.episodes ?? 0} episodes in all
        </span>
      </span>

      <div className="exam-admin-tools">
        <span className="exam-admin-meta">Drop on</span>
        {/* the season is chosen in the app's own sheet rather than the browser's own chooser, which a
            WebView draws small, cuts short and can lay over the row being worked in */}
        <PickSheet
          value={season}
          options={EXAM_SEASONS.map((held) => ({
            value: held.no,
            label: `Season ${held.no} · ${held.title}`,
          }))}
          onChange={(next) => {
            setSeason(Number(next));
            setAsk(false);
            setDone("");
          }}
          title="Drop on which season"
          description="The season chosen, and every season after it, are cleared from that moment on."
          ariaLabel={`Drop ${record.username || record.user_email} on a season`}
          disabled={busy}
          className="min-w-0 flex-1 basis-[190px]"
        />
        <button
          type="button"
          className={`exam-admin-drop${ask ? " is-ask" : ""}`}
          disabled={busy}
          onClick={() => (ask ? drop() : setAsk(true))}
        >
          {busy
            ? "Dropping…"
            : ask
              ? `Confirm drop on season ${season}`
              : "Drop on this season"}
        </button>
        {ask && !busy ? (
          <button type="button" className="exam-admin-toggle" onClick={() => setAsk(false)}>
            Cancel
          </button>
        ) : null}
      </div>

      {done ? <p className="exam-admin-done">{done}</p> : null}
      {error ? <p className="exam-admin-error" role="alert">{error}</p> : null}
    </div>
  );
}