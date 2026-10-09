import React from "react";
import { Sparkles } from "lucide-react";
import RapPlayer from "@/components/rap/RapPlayer";
import SongSheet from "@/components/rap/SongSheet";
import VoiceRecorder from "@/components/rap/VoiceRecorder";
import { songLines } from "@/lib/songwriter";

/**
 * The songwriter, inside the Rap Studio: one request written out as a whole song — its parts, its
 * verses, its hook and the back-vocal lines behind the lead — and the person's own performance of
 * it, recorded over the beat they chose above.
 */
export default function SongwriterPanel({ songwriter, ready }) {
  const {
    prompt,
    setPrompt,
    song,
    writing,
    recording,
    seconds,
    take,
    kept,
    busy,
    error,
    note,
    write,
    startRecording,
    stopRecording,
    downloadTake,
    keepTrack,
  } = songwriter;

  const off = !ready || !!busy || recording;

  return (
    <>
      <section className="rap-card">
        <div className="rap-card-head">
          <span className="rap-label">Songwriter · andika wimbo</span>
          <span className="rap-hint">Verses, hook na back vocals</span>
        </div>

        <textarea
          className="rap-input rap-area"
          rows={3}
          value={prompt}
          disabled={writing}
          placeholder="Mfano: wimbo wa shukrani kwa familia, Kibembe na Kiswahili pamoja"
          onChange={(event) => setPrompt(event.target.value)}
        />

        <button type="button" className="rap-cta rap-cta-ghost" disabled={off || writing} onClick={write}>
          <Sparkles className="mr-2 inline h-4 w-4 align-[-3px]" />
          {writing ? "Wimbo unaandikwa…" : song ? "Andika wimbo mwingine" : "Andika wimbo kamili"}
        </button>

        <p className="rap-hint">
          Ombi moja, wimbo kamili: lugha inatambuliwa kutoka kwenye ombi lako — Kibembe, Kiswahili,
          English, au zote tatu pamoja. Maneno ya Kibembe yanathibitishwa kutoka kwenye Word Bank.
        </p>

        {error ? <p className="rap-note">{error}</p> : null}
        {note ? <p className="rap-hint">{note}</p> : null}
      </section>

      <SongSheet song={song} />

      <VoiceRecorder
        recording={recording}
        seconds={seconds}
        take={take}
        busy={busy}
        kept={kept}
        onStart={startRecording}
        onStop={stopRecording}
        onDownload={downloadTake}
        onKeep={keepTrack}
      />

      {take ? (
        <RapPlayer
          buffer={take.buffer}
          lines={songLines(song)}
          kind="voice"
          busy={!!busy}
          onReTake={startRecording}
        />
      ) : null}
    </>
  );
}