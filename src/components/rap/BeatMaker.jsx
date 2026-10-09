import React from "react";
import { Download, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { BEAT_STYLES, STEPS } from "@/lib/beatGrid";
import { INSTRUMENTS } from "@/lib/instruments";
import { ROOTS, rootOf } from "@/lib/pitchShift";
import RapTempo from "@/components/rap/RapTempo";
import StudioPills from "@/components/rap/StudioPills";

const BAR_OPTIONS = [
  { id: "1", label: "Baa 1" },
  { id: "2", label: "Baa 2" },
  { id: "4", label: "Baa 4" },
];

/**
 * The beat, built by hand or asked for. A kit is laid out at once for the style that is picked, and
 * every step of every instrument can then be moved by hand: a row added, a step turned on, a row
 * turned up. What the grid holds is played out on the phone and set under the timeline.
 */
export default function BeatMaker({ maker, bpm, ready, onBpm }) {
  const off = !ready || !!maker.busy;

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Tengeneza beat</span>
        <span className="rap-chip">{maker.filled} hatua</span>
      </div>

      <div className="rap-group">
        <span className="rap-label">Otomatiki · kit ya mtindo</span>
        <StudioPills
          options={BEAT_STYLES}
          value={maker.style}
          busy={off}
          onPick={maker.buildKit}
        />
        <p className="rap-hint">Kit nzima inawekwa tayari — kisha gusa hatua yoyote kuibadilisha kwa mkono.</p>
      </div>

      <div className="rap-tl-head">
        <span className="rap-label">Mwendo (BPM)</span>
        <RapTempo bpm={bpm} busy={off} onPick={onBpm} />
      </div>

      <div className="rap-group">
        <span className="rap-label">Baa</span>
        <StudioPills
          options={BAR_OPTIONS}
          value={String(maker.bars)}
          busy={off}
          onPick={(id) => maker.setBars(Number(id))}
        />
      </div>

      <div className="rap-key">
        <span className="rap-label">Root ya ala</span>
        <StudioPills
          options={ROOTS}
          value={ROOTS.find((one) => one.pc === maker.rootPc)?.id || "a"}
          busy={off}
          onPick={(id) => maker.setRootPc(rootOf(id).pc)}
        />
      </div>

      <div className="rap-group">
        <span className="rap-label">Ongeza ala</span>
        <div className="rap-add-row">
          {INSTRUMENTS.map((one) => (
            <button
              key={one.id}
              type="button"
              className="rap-mini rap-mini-wide"
              onClick={() => maker.addRow(one.id)}
              disabled={off || maker.rows.some((row) => row.instrument === one.id)}
            >
              <Plus className="h-3 w-3" />
              {one.label}
            </button>
          ))}
        </div>
      </div>

      {maker.rows.length ? (
        <ul className="rap-grid-rows">
          {maker.rows.map((row, index) => (
            <li key={row.id} className="rap-grid-row">
              <div className="rap-grid-head">
                <span className="rap-track-name">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {maker.instruments[index]?.label || row.instrument}
                </span>
                <input
                  className="rap-slider rap-slider-sm"
                  type="range"
                  min="0"
                  max="1.2"
                  step="0.05"
                  value={row.volume}
                  onChange={(event) => maker.setVolume(row.id, Number(event.target.value))}
                  disabled={off}
                  aria-label="Volume ya ala"
                />
                <button
                  type="button"
                  className="rap-tool rap-tool-sm"
                  aria-label="Ondoa ala hii"
                  onClick={() => maker.removeRow(row.id)}
                  disabled={off}
                >
                  <Trash2 />
                </button>
              </div>

              <div className="rap-grid-steps">
                {Array.from({ length: STEPS }, (_, step) => (
                  <button
                    key={step}
                    type="button"
                    className={`rap-grid-step ${row.steps[step] ? "is-on" : ""} ${
                      step % 4 === 0 ? "is-beat" : ""
                    }`}
                    aria-label={`Hatua ${step + 1}`}
                    onClick={() => maker.toggle(row.id, step)}
                    disabled={off}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rap-hint">Ongeza ala hapo juu, au chagua kit ya mtindo kuanza na beat kamili.</p>
      )}

      <div className="rap-mix-tools">
        <button type="button" className="rap-cta" onClick={maker.useBeat} disabled={off}>
          Weka kwenye timeline
        </button>
        <button type="button" className="rap-cta rap-cta-ghost" onClick={maker.download} disabled={off}>
          <Download className="mr-2 inline h-4 w-4 align-[-3px]" />
          Pakua beat
        </button>
        <button type="button" className="rap-dl-row rap-dl-inline" onClick={maker.clearGrid} disabled={off}>
          <span className="rap-dl-label">
            <Trash2 className="h-4 w-4" />
            Futa grid
          </span>
        </button>
      </div>

      {maker.note ? <p className="rap-hint">{maker.note}</p> : null}
      {maker.error ? <p className="rap-note">{maker.error}</p> : null}
    </section>
  );
}