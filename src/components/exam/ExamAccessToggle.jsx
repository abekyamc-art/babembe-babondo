import React, { useState } from "react";
import { KeyRound } from "lucide-react";
import { saveExamAccess, useExamAccess, useExamAdmin } from "@/lib/examAccess";
import "@/exam-access.css";

/**
 * The admin's own switch at the head of the examination: with it on, an admin takes any season and any
 * episode, whatever stands passed before it, so the whole examination can be read through before
 * students meet it.
 *
 * It is the admin's alone — a student is shown nothing of it, and the examination a student opens is
 * never changed by it. An attempt taken while it stands is read, not written: it is marked and its
 * report shown, and nothing of it stands in progress or on the leaderboard.
 */
export default function ExamAccessToggle() {
  const admin = useExamAdmin();
  const on = useExamAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // nothing of this stands on a student's screen
  if (!admin) return null;

  const flip = async () => {
    setBusy(true);
    setError("");
    try {
      await saveExamAccess(!on);
    } catch (err) {
      setError("The setting could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`exam-access${on ? " is-on" : ""}`}>
      <div className="exam-access-row">
        <span className="exam-access-body">
          <span className="exam-access-title">
            <KeyRound aria-hidden="true" /> Unrestricted exam access — admin only
          </span>
          <span className="exam-access-note">
            {on
              ? "On — every season and every episode stands open, and an attempt taken this way is read, not written: it stands in neither progress nor the leaderboard."
              : "Off — the examination follows its own order: an episode opens when the one before it is passed, and a season when the one before it is cleared."}
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Unrestricted exam access"
          className="exam-access-switch"
          disabled={busy}
          onClick={flip}
        >
          <span className="exam-access-knob" aria-hidden="true" />
          <span className="exam-access-state">{on ? "On" : "Off"}</span>
        </button>
      </div>
      {error ? <p className="exam-access-error" role="alert">{error}</p> : null}
    </div>
  );
}