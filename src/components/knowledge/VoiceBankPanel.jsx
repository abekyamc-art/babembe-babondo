import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Circle, Mic, Play, Square, Trash2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  RECORD_MAX_MS,
  approveVariant,
  clipUrl,
  dismissVariant,
  hearClip,
  removeVariant,
  saveVariant,
  startRecording,
} from "@/lib/voiceBank";

/**
 * The private voice bank: short recordings of the person's own voice, each one labelled with the word
 * it is of and the conditions it was made in.
 *
 * A recording is never a word of its own: it teaches the app how one confirmed word is really said —
 * softly, far from the phone, quickly, over noise, with the syllables broken up — so a word said that
 * way is recognised the more surely the more of it has been recorded. Nothing reaches the hearing
 * until the admin approves it, and the recordings themselves stay in private storage.
 */

const CONDITIONS = [
  { id: "normal", label: "Normal" },
  { id: "quiet", label: "Quiet" },
  { id: "distant", label: "Far away" },
  { id: "fast", label: "Fast" },
  { id: "noisy", label: "Noisy" },
  { id: "interrupted", label: "Broken up" },
];

const MAX_NOTE = 200;

export default function VoiceBankPanel() {
  const [words, setWords] = useState([]);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [condition, setCondition] = useState("normal");
  const [note, setNote] = useState("");

  const [clip, setClip] = useState(null);
  // a clip is being recorded right now: kept in state, so the screen follows it as it runs
  const [live, setLive] = useState(false);
  const [heard, setHeard] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [rows, setRows] = useState(null);
  const [playing, setPlaying] = useState("");

  const recRef = useRef(null);
  const audioRef = useRef(null);
  const stopRef = useRef(null);

  /** The confirmed words to choose from, the ones matching what has been typed first. */
  const loadWords = useCallback(async (search) => {
    const asked = String(search || "").trim();
    const page = await base44.entities.AssistantKnowledge.filter(
      asked
        ? { kind: "word", term: { $regex: asked, $options: "i" } }
        : { kind: "word" },
      { sort: "-updated_date", limit: 40, fields: ["term", "meaning"] }
    );
    return page?.items || [];
  }, []);

  const loadRows = useCallback(async () => {
    const page = await base44.entities.VoiceVariant.list({ sort: "-created_date", limit: 60 });
    return page?.items || [];
  }, []);

  const refresh = useCallback(async () => {
    try {
      setRows(await loadRows());
      setError("");
    } catch (err) {
      setRows([]);
      setError("The recordings could not be read just now.");
    }
  }, [loadRows]);

  useEffect(() => {
    let alive = true;
    loadWords("")
      .then((found) => {
        if (alive) setWords(found);
      })
      .catch(() => {
        if (alive) setWords([]);
      });
    refresh();
    return () => {
      alive = false;
    };
  }, [loadWords, refresh]);

  // the search reads the words on the server, so the whole bank is reachable and not one page of it
  useEffect(() => {
    if (!query) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      loadWords(query)
        .then((found) => {
          if (alive) setWords(found);
        })
        .catch(() => {});
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, loadWords]);

  // nothing is left recording once the panel is gone
  useEffect(
    () => () => {
      recRef.current?.cancel();
      audioRef.current?.pause();
    },
    []
  );

  const stopRecording = useCallback(async () => {
    const controller = recRef.current;
    recRef.current = null;
    setLive(false);
    clearInterval(stopRef.current);
    stopRef.current = null;
    if (!controller) return;
    try {
      const made = await controller.stop();
      setSeconds(made.seconds);
      setClip(made);
      // what the app's own ears make of this very recording, so the way this word is said is written
      // down beside it before it is saved
      setBusy("listen");
      setHeard(await hearClip(made.blob));
    } catch (err) {
      setError("That recording could not be read. Try again, a little closer to the phone.");
    } finally {
      setBusy("");
    }
  }, []);

  const record = useCallback(async () => {
    if (recRef.current) {
      await stopRecording();
      return;
    }
    setError("");
    setClip(null);
    setHeard("");
    setSeconds(0);
    try {
      const controller = await startRecording();
      recRef.current = controller;
      setLive(true);
      setSeconds(0);
      // a recording ends by itself at the longest a clip may be
      stopRef.current = setInterval(() => {
        if (!recRef.current) return;
        setSeconds(recRef.current.seconds());
        if (recRef.current.seconds() * 1000 >= RECORD_MAX_MS) stopRecording();
      }, 250);
    } catch (err) {
      recRef.current = null;
      setLive(false);
      setError("The microphone could not be opened — check that this site may use it.");
    }
  }, [stopRecording]);

  const save = useCallback(async () => {
    const word = term.trim();
    if (!word) {
      setError("Choose the word this recording is of first.");
      return;
    }
    if (!clip) {
      setError("Record the word first, then save it.");
      return;
    }
    setBusy("save");
    setError("");
    try {
      await saveVariant({ term: word, condition, note: note.slice(0, MAX_NOTE), ...clip, heard });
      setClip(null);
      setHeard("");
      setSeconds(0);
      setNote("");
      await refresh();
    } catch (err) {
      setError("That recording could not be saved — try again in a moment.");
    } finally {
      setBusy("");
    }
  }, [clip, condition, heard, note, refresh, term]);

  const play = useCallback(async (row) => {
    const url = await clipUrl(row.file_uri);
    if (!url) {
      setError("That recording could not be opened.");
      return;
    }
    audioRef.current?.pause();
    const sound = new Audio(url);
    audioRef.current = sound;
    setPlaying(row.id);
    sound.onended = () => setPlaying("");
    sound.play().catch(() => {
      setPlaying("");
      setError("That recording could not be played.");
    });
  }, []);

  const act = useCallback(
    async (what, id) => {
      setBusy(id);
      setError("");
      try {
        if (what === "approve") await approveVariant(id);
        else if (what === "dismiss") await dismissVariant(id);
        else await removeVariant(id);
        await refresh();
      } catch (err) {
        setError("That could not be done just now — try again in a moment.");
      } finally {
        setBusy("");
      }
    },
    [refresh]
  );

  const recording = live;

  return (
    <div className="account-panel">
      <div className="knowledge-form">
        <div className="knowledge-field">
          <span className="knowledge-label">The word this recording is of</span>
          <input
            className="account-input"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Mfano: Olebile?"
            aria-label="The word this recording is of"
          />
          <input
            className="account-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the saved words"
            aria-label="Search the saved words"
          />
        </div>

        <div className="knowledge-field">
          <span className="knowledge-label">How it was said</span>
          <div className="knowledge-switch" role="group" aria-label="Recording conditions">
            {CONDITIONS.map((one) => (
              <button
                key={one.id}
                type="button"
                onClick={() => setCondition(one.id)}
                aria-pressed={condition === one.id}
                className={`knowledge-tab${condition === one.id ? " is-active" : ""}`}
              >
                {one.label}
              </button>
            ))}
          </div>
        </div>

        {words.length ? (
          <div className="knowledge-switch" aria-label="Saved words">
            {words.slice(0, 12).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setTerm(row.term || "")}
                className="knowledge-tab"
              >
                {row.term}
              </button>
            ))}
          </div>
        ) : (
          <p className="knowledge-empty">
            The Word Bank holds no word to record yet — save the words first, then record them here.
          </p>
        )}

        <div className="knowledge-pick-bar">
          <button
            type="button"
            onClick={record}
            disabled={!!busy}
            className={`knowledge-pick${recording ? "" : " is-go"}`}
          >
            {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {recording ? `Stop — ${seconds}s` : "Record"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!!busy || !clip || !term.trim()}
            className="knowledge-pick"
          >
            {busy === "save" ? <Circle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            Save the recording
          </button>
          {clip && !busy ? (
            <span className="knowledge-meter-text">
              {clip.seconds}s recorded{heard ? ` · heard as “${heard}”` : ""}
            </span>
          ) : null}
          {busy === "listen" ? <span className="knowledge-meter-text">Reading it back…</span> : null}
        </div>

        <div className="knowledge-field">
          <span className="knowledge-label">A note, if you want one</span>
          <input
            className="account-input"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE))}
            placeholder="Mfano: said softly"
            aria-label="A note about the recording"
          />
        </div>

        {error ? <p className="knowledge-error">{error}</p> : null}
      </div>

      <div className="knowledge-field">
        <span className="knowledge-label">The recordings kept</span>
        {rows === null ? (
          <p className="knowledge-empty">Reading them…</p>
        ) : rows.length ? (
          rows.map((row) => (
            <div key={row.id} className="knowledge-row">
              <div className="knowledge-body">
                <div className="knowledge-title">
                  {row.term}
                  <span className="doc-chip" style={{ marginLeft: 8 }}>
                    {row.approved ? "in use" : "waiting"}
                  </span>
                </div>
                <div className="knowledge-text">
                  {CONDITIONS.find((one) => one.id === row.condition)?.label || "Normal"}
                  {row.heard ? ` · heard as “${row.heard}”` : ""}
                  {row.seconds ? ` · ${row.seconds}s` : ""}
                  {row.note ? ` · ${row.note}` : ""}
                </div>
              </div>
              <div className="knowledge-tools">
                <button
                  type="button"
                  onClick={() => play(row)}
                  disabled={!!busy}
                  aria-label={`Play the recording of ${row.term}`}
                  className="knowledge-tool"
                >
                  <Play className="h-4 w-4" />
                </button>
                {row.approved ? (
                  <button
                    type="button"
                    onClick={() => act("dismiss", row.id)}
                    disabled={!!busy}
                    aria-label={`Stop using the recording of ${row.term}`}
                    className="knowledge-tool"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => act("approve", row.id)}
                    disabled={!!busy}
                    aria-label={`Use the recording of ${row.term}`}
                    className="knowledge-tool"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => act("remove", row.id)}
                  disabled={!!busy}
                  aria-label={`Throw away the recording of ${row.term}`}
                  className="knowledge-tool knowledge-tool-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="knowledge-empty">
            No recordings kept yet. Record a word the way you really say it, then approve it — the
            hearing learns from the recordings you approve, and from nothing else.
          </p>
        )}
      </div>
    </div>
  );
}