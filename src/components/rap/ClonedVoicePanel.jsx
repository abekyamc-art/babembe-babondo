import React, { useRef, useState } from "react";
import { BadgeCheck, Mic2, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { fetchAudio } from "@/lib/rapAudio";
import { clipToBuffer } from "@/lib/clipRecorder";

const VOICES_KEY = "rapClonedVoices";

function readVoices() {
  try {
    const raw = window.localStorage.getItem(VOICES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

function keepVoices(list) {
  try {
    window.localStorage.setItem(VOICES_KEY, JSON.stringify(list.slice(0, 12)));
  } catch (err) {
    // the voices stay for this sitting only
  }
}

/**
 * A voice of the person's own, or one they are allowed to use: a short clip is handed to Cartesia
 * once, and the lines are then sung in that voice. Nothing is cloned, and nothing is sung, without
 * the person's own word that they may use the voice — the box has to be ticked first.
 *
 * The singing is Cartesia's. The pitch work in the tracks beside this panel is the app's own shift,
 * not a Cartesia feature.
 */
export default function ClonedVoicePanel({ busy, ready, lines, language, speed, onAddSung }) {
  const [voices, setVoices] = useState(readVoices);
  const [voiceId, setVoiceId] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef(null);

  const off = !ready || !!busy || !!working;

  /** The clip handed over once, and the voice it makes. */
  const clone = async (file) => {
    setError("");
    setNote("");
    if (!consent) {
      setError("Thibitisha kwanza kwamba una ruhusa ya kutumia sauti hii.");
      return;
    }
    setWorking("clone");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
      const res = await base44.functions.invoke("rapVoiceClone", {
        action: "clone",
        consent: true,
        name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        clip_url: signed_url,
      });
      const made = res?.data || {};
      if (!made.voice_id) throw new Error(made.error || "clone");

      const label = (name.trim() || "Sauti yangu").slice(0, 40);
      const next = [{ id: made.voice_id, name: label }, ...voices.filter((one) => one.id !== made.voice_id)];
      setVoices(next);
      keepVoices(next);
      setVoiceId(made.voice_id);
      setNote(`Sauti “${label}” iko tayari — unaweza kuimba mistari yako kwayo.`);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Sauti haikuweza kuundwa. Tumia klipi fupi la sauti safi, kisha jaribu tena."
      );
    }
    setWorking("");
  };

  /** The lines sung in the voice that was picked, brought into a lane of the tracks. */
  const sing = async () => {
    setError("");
    setNote("");
    if (!consent) {
      setError("Thibitisha kwanza kwamba una ruhusa ya kutumia sauti hii.");
      return;
    }
    if (!voiceId) {
      setError("Chagua sauti kwanza.");
      return;
    }
    if (!lines?.length) {
      setError("Andika au tunga mistari kwanza, kisha irudi hapa kuimba.");
      return;
    }
    setWorking("sing");
    try {
      const res = await base44.functions.invoke("rapVoiceClone", {
        action: "sing",
        consent: true,
        voice_id: voiceId,
        lines: lines.map((line) => line.ebembe).filter(Boolean),
        language,
        speed,
      });
      const url = res?.data?.audio_url;
      if (!url) throw new Error(res?.data?.error || "sing");

      const buffer = await clipToBuffer(new Blob([await fetchAudio(url)]));
      const label = voices.find((one) => one.id === voiceId)?.name || "Sauti iliyoimbwa";
      onAddSung(buffer, label);
      setNote(`${label} imeimba mistari yako — iko kwenye lane yake sasa.`);
    } catch (err) {
      setError(
        err?.response?.data?.error || "Sauti haikuweza kuimba mistari hii. Jaribu tena baadaye."
      );
    }
    setWorking("");
  };

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Sauti ya kuimba (Cartesia)</span>
        <span className="rap-chip">{voices.length} zilizoundwa</span>
      </div>

      <label className="rap-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          Nina ruhusa ya kutumia sauti hii — ni sauti yangu mwenyewe, au nimepewa ruhusa ya kuitumia.
        </span>
      </label>

      <div className="rap-group">
        <span className="rap-label">Klipi ya sauti</span>
        <div className="rap-add-row">
          <button
            type="button"
            className="rap-cta rap-cta-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={off || !consent}
          >
            <Upload className="mr-2 inline h-4 w-4 align-[-3px]" />
            Chagua klipi
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="rap-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) clone(file);
            }}
          />
        </div>
        <input
          className="rap-input"
          type="text"
          value={name}
          placeholder="Jina la sauti"
          onChange={(event) => setName(event.target.value)}
          disabled={off}
        />
        <p className="rap-hint">
          Klipi fupi (sekunde 10–60) la sauti safi, bila muziki nyuma.
        </p>
      </div>

      {voices.length ? (
        <div className="rap-group">
          <span className="rap-label">Sauti zangu</span>
          <div className="rap-voices">
            {voices.map((one) => (
              <button
                key={one.id}
                type="button"
                className={`rap-pill ${one.id === voiceId ? "is-active" : ""}`}
                onClick={() => setVoiceId(one.id)}
                disabled={off}
              >
                <Mic2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                {one.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button type="button" className="rap-cta" onClick={sing} disabled={off || !consent || !voiceId}>
        <Sparkles className="mr-2 inline h-4 w-4 align-[-3px]" />
        {working === "sing" ? "Inaimba mistari yako…" : "Imba mistari yangu kwa sauti hii"}
      </button>

      {working === "clone" ? (
        <p className="rap-hint">
          <BadgeCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
          Sauti inaundwa kutoka klipi yako…
        </p>
      ) : null}
      {note ? <p className="rap-hint">{note}</p> : null}
      {error ? <p className="rap-note">{error}</p> : null}

      <p className="rap-hint">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        Klipi yako inahifadhiwa kwa faragha ndani ya app, na key ya Cartesia inabaki kwenye seva — haitumwa
        kwenye simu.
      </p>
    </section>
  );
}