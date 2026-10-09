import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/** As many pictures as one call may move at once. */
const RUN = 100;

/** The ids cut into runs, so a list of any length is moved on in bounded calls. */
const runsOf = (ids, size) => {
  const runs = [];
  for (let at = 0; at < ids.length; at += size) runs.push(ids.slice(at, at + size));
  return runs;
};

/**
 * Every picture at once: the whole queue is chosen in one go, agreed in one run, and saved — and the
 * knowledge is published with the pictures, so the assistants read them straight away.
 *
 * The two looks are still two: every chosen picture is agreed first, in its own action, and only the
 * pictures whose words are agreed are then saved, in a second action. Nothing is saved on one look.
 * Runs longer than one call carries are cut into bounded calls, so any number of pictures moves the
 * same way. A picture with no word beside it cannot be agreed and is left standing where it is.
 */
export default function BulkApprove({ suggested, confirmed, busy, ask, onDone, onNote, onError }) {
  const [chosen, setChosen] = useState([]);
  const [armed, setArmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");

  // what can move on: the pictures waiting to be agreed that carry a word, and the ones already agreed
  const ready = suggested.filter((row) => String(row.term || "").trim());
  const everything = [...ready, ...confirmed];
  const noWord = suggested.length - ready.length;
  const picked = everything.filter((row) => chosen.includes(row.id));
  const held = running || !!busy;

  const publish = async () => {
    try {
      const res = await base44.functions.invoke("knowledgeDoc", { action: "publish" });
      const data = res?.data || {};
      return data.error ? `not published — ${data.error}` : "published";
    } catch (error) {
      return "not published — publish it from the Knowledge panel";
    }
  };

  // A run that is interrupted says plainly how far it came: what has already moved on stays moved,
  // and pressing again carries on from where it stopped.
  const stop = (agreed = 0, saved = 0) => {
    setRunning(false);
    setProgress("");
    onNote(
      `The run stopped part way — ${agreed} ${agreed === 1 ? "word was" : "words were"} agreed and ` +
        `${saved} ${saved === 1 ? "picture was" : "pictures were"} saved. What has moved on stays moved; press again to carry on.`
    );
  };

  const run = async () => {
    setArmed(false);
    setRunning(true);
    onError("");

    const agree = picked.filter((row) => row.stage !== "confirmed");
    const agreedBefore = picked.filter((row) => row.stage === "confirmed").map((row) => row.id);
    const agreeIds = agree.map((row) => row.id);
    const terms = Object.fromEntries(agree.map((row) => [row.id, String(row.term || "").trim()]));

    let agreed = 0;
    let notInDoc = 0;
    let done = 0;

    // the first look, in runs of its own: one action agrees the words, and nothing is saved yet
    for (const part of runsOf(agreeIds, RUN)) {
      setProgress(`Agreeing the words — ${done + part.length} of ${agreeIds.length}`);
      const data = await ask("confirm", { ids: part, terms }, "bulk");
      if (!data) {
        stop(agreed, 0);
        return;
      }
      agreed += data.confirmed;
      notInDoc += data.not_in_doc;
      done += part.length;
    }

    // the second look, in runs of its own: only what has been agreed is saved, so the two looks stay two
    const saving = [...agreedBefore, ...agreeIds];
    let saved = 0;
    let left = 0;
    done = 0;

    for (const part of runsOf(saving, RUN)) {
      setProgress(`Saving the pictures — ${done + part.length} of ${saving.length}`);
      const data = await ask("approve", { ids: part }, "bulk");
      if (!data) {
        stop(agreed, saved);
        return;
      }
      saved += data.saved;
      left += data.waiting;
      done += part.length;
    }

    // and the knowledge the assistants read is published with them
    setProgress("Publishing the knowledge…");
    const said = await publish();

    const report = [
      `Agreed ${agreed} ${agreed === 1 ? "word" : "words"} in the first look`,
      `saved ${saved} ${saved === 1 ? "picture" : "pictures"} into your knowledge`,
    ];
    if (left) report.push(`${left} had no agreed word and stayed in the first look`);
    if (notInDoc) report.push(`${notInDoc} stand beside a word that is not written in your document yet`);
    if (noWord) report.push(`${noWord} carry no word at all and were left alone`);

    setRunning(false);
    setProgress("");
    setChosen([]);
    onNote(`${report.join(" · ")} · the knowledge is ${said}.`);
    onDone();
  };

  const go = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    run();
  };

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">Every picture at once</span>

      <span className="knowledge-meter-text">
        Choose the whole queue — the pictures waiting to be agreed and the ones already agreed — and move
        them on in one run: each one is agreed first, then saved into your knowledge on its second look,
        and your knowledge is published with them, so the assistants read the pictures straight away.
      </span>

      <div className="knowledge-pick-bar">
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setChosen(everything.map((row) => row.id));
          }}
          disabled={held || !everything.length}
          className="knowledge-pick"
        >
          Choose all {everything.length}
        </button>

        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setChosen([]);
          }}
          disabled={held || !picked.length}
          className="knowledge-pick"
        >
          Clear
        </button>

        <span className="knowledge-meter-text">
          {picked.length
            ? `${picked.length} ${picked.length === 1 ? "picture" : "pictures"} chosen`
            : "Nothing chosen yet"}
        </span>
      </div>

      <button
        type="button"
        onClick={go}
        disabled={held || !picked.length}
        className="knowledge-pick is-go"
      >
        {held ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {armed
          ? `Tap again — approve ${picked.length} and publish`
          : `Approve all and publish · ${picked.length}`}
      </button>

      {running ? <span className="knowledge-meter-text">{progress}</span> : null}

      {noWord ? (
        <span className="knowledge-meter-text">
          {noWord} {noWord === 1 ? "picture carries" : "pictures carry"} no word yet — name them above, and
          they move with the next run.
        </span>
      ) : null}
    </div>
  );
}