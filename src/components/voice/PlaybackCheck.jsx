import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import AccountIcon from "@/components/voice/AccountIcon";

/**
 * Checking the app's own song playback, one AI at a time.
 *
 * The app itself is what reads a play request and what plays the piece: the voices only take the call.
 * So the check is the same walk for every AI on the ring — a call is opened, the same request is made,
 * and what is written down for the AI holding that call is what the app's own player really did: the
 * piece it put in the player, the moment the player itself reported the sound had begun, and whether
 * the call ended with it. Nothing here is claimed by itself; every line is read from the state of the
 * call and of the app's own player.
 *
 * The AIs are checked one after another, in the order the ring runs, and each one's result stands
 * beside it until the whole ring has been walked. A request that reaches no sound is written down with
 * the reason the app's own selection or player gave for it, so nothing is left as a silent failure.
 */
const CHECK_PHRASE = "play Gloire Sadiki";
// what makes a turn a song asked for, so a turn of ordinary talk is never counted as one
const PLAY_ASK = /\b(play|piga|imba|nyimbo|wimbo|muziki|song|weka|sikiliza|listen)\b/i;
// the longest a request is given to reach the app's own player before its outcome is written down
const WAIT_MS = 25000;

export default function PlaybackCheck({ open, onClose, seats, voiceLabel, micActive, turns, media }) {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState({});
  const rowsRef = useRef({});
  const askedRef = useRef(null);
  const seatRef = useRef("");
  const usersRef = useRef(0);
  const startedRef = useRef(false);
  const timerRef = useRef(0);
  const noteRef = useRef("");
  // the app's own line about its own player, as it stands right now
  noteRef.current = media?.note || "";

  const mark = useCallback((id, next) => {
    if (!id) return;
    const held = { ...rowsRef.current, [id]: next };
    rowsRef.current = held;
    setRows(held);
  }, []);

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);

  const list = Array.isArray(seats) ? seats : [];
  /**
   * Which seat of the ring a name on the screen stands for. The Cartesia seat answers under the name of
   * the account that really took the call — Cartesia AI 1, Cartesia AI 2, one of its backups — and every
   * one of those is that same one seat of the ring.
   */
  const seatOf = useCallback(
    (label) => {
      const named = String(label || "");
      if (!named) return null;
      const exact = list.find((seat) => seat.label === named);
      if (exact) return exact;
      return (
        list
          .filter((seat) => named.startsWith(seat.label))
          .sort((a, b) => b.label.length - a.label.length)[0] || null
      );
    },
    [list]
  );

  /** The whole check is put down and started again from the first AI of the ring. */
  const begin = useCallback(() => {
    clearTimer();
    rowsRef.current = {};
    setRows({});
    askedRef.current = null;
    seatRef.current = "";
    // a piece already playing when the check opens is not credited to anyone
    startedRef.current = media?.started === true;
    usersRef.current = (turns || []).filter((turn) => turn.role === "user").length;
    setRunning(true);
  }, [clearTimer, media?.started, turns]);

  /**
   * A song asked for while an AI holds the call: the AI holding it is the one being checked, and what
   * the app's own selection makes of the request is what is written down for it.
   */
  useEffect(() => {
    if (!running) return;
    const said = turns || [];
    const asked = said.filter((turn) => turn.role === "user").length;
    if (asked === usersRef.current) return;
    usersRef.current = asked;
    const words = said.filter((turn) => turn.role === "user").at(-1)?.text || "";
    // a written request has no AI on the line, so it is no part of this check
    if (!micActive || !PLAY_ASK.test(words)) return;
    const seat = seatOf(voiceLabel);
    if (!seat || rowsRef.current[seat.id]?.state === "good") return;
    seatRef.current = seat.id;
    askedRef.current = { seatId: seat.id, note: noteRef.current };
    mark(seat.id, { state: "check", detail: `asked “${words}” — the app's own player is being waited on` });
    clearTimer();
    timerRef.current = setTimeout(() => {
      const at = askedRef.current;
      if (!at) return;
      const note = noteRef.current;
      // the app has put its own question to the person — which one is meant: the check waits on it
      if (/^Which one/i.test(note)) {
        mark(at.seatId, { state: "check", detail: note });
        return;
      }
      mark(at.seatId, {
        state: "bad",
        detail: /^Nimekuweka/.test(note)
          ? "the piece was put in the app's own player, but the sound never began"
          : note && note !== at.note
            ? note
            : "nothing was put in the app's own player for that request",
      });
    }, WAIT_MS);
  }, [turns, micActive, voiceLabel, running, seatOf, mark, clearTimer]);

  /** The player itself reports that the sound has really begun: that is the thing being checked. */
  useEffect(() => {
    const playing = media?.started === true;
    if (!playing) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    if (!running) return;
    const id = seatRef.current || seatOf(voiceLabel)?.id || "";
    if (!id) return;
    clearTimer();
    const name = media?.item?.name || "the piece";
    const ended = /call is over/i.test(media?.note || "");
    mark(id, {
      state: "good",
      detail: `played “${name}” in the app's own player${ended ? ", and the call ended with it" : ""}`,
    });
  }, [media?.started, media?.item?.name, media?.note, running, seatOf, voiceLabel, mark, clearTimer]);

  if (!open) return null;

  const done = list.filter((seat) => {
    const state = rows[seat.id]?.state;
    return state === "good" || state === "bad";
  });
  const good = list.filter((seat) => rows[seat.id]?.state === "good").length;
  const finished = running && list.length > 0 && done.length === list.length;
  const untouched = list.find((seat) => !rows[seat.id]);
  const line = !running
    ? ""
    : micActive
      ? `A call is on with ${voiceLabel}. Say “${CHECK_PHRASE}” now.`
      : `Start a call and say “${CHECK_PHRASE}”${
          untouched ? ` — the next AI to be checked is ${untouched.label}.` : "."
        }`;

  // drawn over the whole screen, in the account surface's own palette
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close the song playback check"
        onClick={onClose}
        className="account-backdrop absolute inset-0"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Song playback check"
        className="account-sheet"
      >
        <div className="account-top">
          <span className="account-brand">Song playback check</span>
          <div className="account-tools">
            <AccountIcon label="Close the song playback check" onClick={onClose} />
          </div>
        </div>

        <div className="account-panel">
          <p className="knowledge-text">
            Every AI takes the call in turn, and the app's own player is what plays the song. While a
            call is on, ask each one the same thing — “{CHECK_PHRASE}” — and every AI whose call really
            ends with the song playing here is marked good. Close this to make the call: the check keeps
            running, and what it finds stands beside each AI below.
          </p>

          {!running || finished ? (
            <div className="knowledge-pick-bar">
              <button type="button" className="knowledge-pick is-go" onClick={begin}>
                {running ? "Check again" : "Start the check"}
              </button>
            </div>
          ) : (
            <p className="knowledge-text">{line}</p>
          )}

          {list.map((seat) => {
            const row = rows[seat.id] || { state: "idle", detail: "not checked yet" };
            const busy = row.state === "check";
            const Icon = busy ? Loader2 : row.state === "good" ? CheckCircle2 : row.state === "bad" ? XCircle : CircleDashed;
            return (
              <div key={seat.id} className="knowledge-row">
                <div className="knowledge-body">
                  <div className="knowledge-title">
                    {seat.label}
                    {micActive && seatOf(voiceLabel)?.id === seat.id ? " — on the line now" : ""}
                  </div>
                  <div className="knowledge-text">{row.detail}</div>
                </div>
                <span
                  className={`knowledge-tools ${
                    row.state === "good" ? "check-good" : row.state === "bad" ? "check-bad" : ""
                  }`}
                >
                  <Icon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                </span>
              </div>
            );
          })}

          {finished ? (
            <p className="knowledge-text">
              {good} of {list.length} AIs played the song in the app.{" "}
              {good === list.length
                ? "Everything is good."
                : "Not everything is good — the row that failed stands with the reason it gave."}
            </p>
          ) : null}
        </div>
      </section>
    </div>,
    document.body
  );
}