import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import useTalkVoice from "@/hooks/useTalkVoice";
import useCartesiaVoice from "@/hooks/useCartesiaVoice";
import { askCoordinator } from "@/lib/handoffSignal";
import { CARTESIA_AI } from "@/lib/providerNames";
import {
  CARTESIA_ANSWERS,
  FIRST_TALK,
  TALK_ANSWERS,
  TALK_IDS,
  handoffNotice,
  noSignalNotice,
} from "@/lib/talkRotation";

/**
 * The home page's call, and who is on it.
 *
 * Cartesia AI opens every call and answers seven questions; the app's older talk AIs then take the
 * call in turn, each on its own account with its own key and its own agent, and each answering two
 * questions before the turn is passed on. Once they have all had a turn Cartesia AI is handed the
 * call back, so the ring keeps moving and the person keeps talking without ever starting the next
 * voice themselves: the call on air is hung up and the next one opens straight away.
 *
 * What makes the change actually land is that it is a plain sequence of events, not a reading of the
 * screen:
 *
 * 1. The last answer of a turn asks for the change; the voice itself reports the moment that answer
 *    has been read out, and that report is what sends the change — so no voice is cut off
 *    mid-sentence, and nothing about the screen's state decides when the call moves.
 * 2. The voice taking the next turn is asked for while the answer before the last one is still being
 *    given, and the asking is capped: a signal that never comes still passes the turn in order, so
 *    the rotation is never left waiting on one.
 * 3. The voices are opened in the order the turn passes, each once in a call. The name on the screen
 *    follows the call that actually opened, and when none can open the voice that stood down takes
 *    the call back with the reason said plainly.
 */

const CARTESIA = "cartesia";
const TALK = "talk";

/** Nothing, after the given moment: a wait that always comes back. */
const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(""), ms);
  });

// The signal is given this long, from its account being opened to its answer coming back. It is
// asked for while the answer before the last one is still being given, so it is almost always in
// hand by the time the call moves; a signal that does not come in time is not waited on.
const SIGNAL_MAX_MS = 12000;

// The longest the answer that asked for the change is given to finish being read out. The answer's
// own end is what sends the change — this only stops a call whose end was never reported from
// sitting on a voice that has already taken its turn.
const DRAIN_MAX_MS = 30000;

export default function useHomeVoice() {
  const [turns, setTurns] = useState([]);
  // who is on the call right now, written on the screen itself
  const [holder, setHolder] = useState(CARTESIA);
  const [voice, setVoice] = useState(CARTESIA_AI);
  const [notice, setNotice] = useState("");

  // the voice that holds the call, kept in a ref because the handlers that read it were handed to
  // the calls as they opened
  const holderRef = useRef(CARTESIA);
  // the talk AI on the call now, and how many talk turns have been taken since Cartesia AI last held
  // it — once each of them has had one, the call goes back to Cartesia AI
  const talkRef = useRef({ ...FIRST_TALK });
  const takenRef = useRef(0);
  // the finished answers given by whoever holds the call now
  const answersRef = useRef(0);
  // a call is on air, and is being handed over: neither a turn taken outside a call nor one taken
  // while the change is running is counted
  const callingRef = useRef(false);
  const turningRef = useRef(false);
  // what an answer is charged through, and the change itself, each kept in a ref because the
  // handlers that send them are handed to the calls as they open
  const chargeRef = useRef(null);
  const handoffRef = useRef(null);
  // the change the last answer asked for, and the guard that sends it if that answer's end is never
  // reported
  const dueRef = useRef(false);
  const dueTimerRef = useRef(0);
  // an outside AI that could not take the call is not asked again during the same call
  const downRef = useRef(false);
  // the voices that could not take the call in this one: their turn is never offered to them twice
  const triedRef = useRef(new Set());
  // the signal asked for while the answer before the last one was still being given
  const signalRef = useRef(null);

  // the whole talk is kept here, so a call that hands over carries the conversation with it and
  // nothing said before the change is lost from the screen
  const onTurn = useCallback((role, text) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  /**
   * The handoff signal, read and checked on the server. A signal that names nobody — or names the
   * voice already on the call, or an account whose key and agent are not both saved — is refused
   * there rather than guessed at, and the turn passes to the talk AI that follows in order. Where
   * even the server cannot be asked, the turn passes in order here, so nothing about a signal can
   * leave the rotation standing still on one voice.
   */
  const askServer = useCallback(async (fromId, reply) => {
    try {
      const res = await base44.functions.invoke("callHandoff", { reply: reply || "", from: fromId });
      const next = res?.data?.next;
      if (next?.id) return next;
    } catch (err) {
      // the turn is passed on in order instead
    }
    // the standing talk AI, ready to take a turn whenever it is not the voice already on the call
    return fromId === FIRST_TALK.id ? null : { ...FIRST_TALK };
  }, []);

  /** The coordinator's own answer, and the voice it names — or the next one in order. */
  const nextTalk = useCallback(
    async (from) => {
      const named = await Promise.race([
        (async () => {
          try {
            return await askCoordinator(from.label);
          } catch (err) {
            return "";
          }
        })(),
        wait(SIGNAL_MAX_MS),
      ]);
      return askServer(from.id, named || "");
    },
    [askServer]
  );

  /** The voice on the call right now: the outside one, or the talk AI that holds it. */
  const whoIsOn = useCallback(() => {
    if (holderRef.current === CARTESIA) {
      return { which: CARTESIA, id: CARTESIA, label: CARTESIA_AI, account: "" };
    }
    return { which: TALK, ...talkRef.current };
  }, []);

  /**
   * The change the last answer asked for, sent the moment that answer has been read out in full.
   * The voice reports its own end, so the call moves on that report and never on a reading of the
   * screen. It runs once and only once.
   */
  const dueHandoff = useCallback(() => {
    if (!dueRef.current) return;
    dueRef.current = false;
    clearTimeout(dueTimerRef.current);
    dueTimerRef.current = 0;
    handoffRef.current?.();
  }, []);

  /**
   * One answer has been given, so it is charged — and counted against the turns whoever holds the
   * call answers before the next voice takes it: Cartesia AI seven, each talk AI two. The last of
   * those only asks for the change: it is sent by that answer's own end, so the voice is never cut
   * off mid-sentence and the screen's state never decides when the call moves.
   */
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    if (!callingRef.current || turningRef.current || dueRef.current) return;
    const limit = holderRef.current === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS;
    answersRef.current += 1;
    if (answersRef.current >= limit) {
      dueRef.current = true;
      clearTimeout(dueTimerRef.current);
      dueTimerRef.current = setTimeout(dueHandoff, DRAIN_MAX_MS);
      return;
    }
    // the voice taking the next turn is asked for while this answer is still being given, so it is
    // already in hand the moment the last one ends
    if (answersRef.current === limit - 1 && !signalRef.current) {
      signalRef.current = nextTalk(whoIsOn());
    }
  }, [dueHandoff, nextTalk, whoIsOn]);

  const talk = useTalkVoice({ onTurn });
  const cartesia = useCartesiaVoice({ onTurn, onAnswered, onAnswerEnd: dueHandoff });

  /** Who holds the call, written on screen and kept in a ref for the handlers sent out with it. */
  const setCurrent = useCallback((which, label) => {
    holderRef.current = which;
    setHolder(which);
    setVoice(label);
  }, []);

  /** A named voice opens the call, and says plainly whether it did. */
  const openVoice = useCallback(
    async (which, slot) => {
      const why =
        which === CARTESIA
          ? await cartesia.start()
          : await talk.start({
              account: slot.account,
              label: slot.label,
              onAnswered,
              onAnswerEnd: dueHandoff,
            });
      return why ? { ok: false, why } : { ok: true, why: "" };
    },
    [cartesia, talk, onAnswered, dueHandoff]
  );

  /** The call on air, hung up. */
  const closeVoice = useCallback(
    async (which) => {
      if (which === CARTESIA) await cartesia.stop();
      else await talk.stop();
    },
    [cartesia, talk]
  );

  /**
   * The change itself: the call on air is hung up and the next voice opens straight away — the
   * person never starts it themselves, and the talk so far stays on the screen and goes with the new
   * call. Who takes it is decided before anything is hung up, and the voices are opened in the order
   * the turn passes, each of them once in a call: a voice that cannot open is never offered the turn
   * twice, and where none of them can open the voice that stood down takes the call back with the
   * reason said plainly rather than the person being left in silence.
   */
  const handoff = useCallback(async () => {
    if (turningRef.current) return;
    turningRef.current = true;
    try {
      const from = whoIsOn();
      const before = { ...talkRef.current };
      const takenBefore = takenRef.current;

      // each older talk AI takes the call in turn, and Cartesia AI is handed it back once they have
      // each had one — its own turn is what starts the ring round again. With Cartesia AI down for
      // this call the ring simply carries on among the talk AIs.
      const ringDone = from.which === TALK && takenRef.current >= TALK_IDS.length;
      const wantedTalk = from.which === CARTESIA || !ringDone || downRef.current;

      // the voice the signal named — asked for while the answer before the last one was still being
      // given — or, where it named nobody, the one that follows in order
      const asked = signalRef.current;
      signalRef.current = null;
      const first = wantedTalk ? await (asked || nextTalk(from)) : null;
      // the person ended the call while the signal was on its way
      if (!callingRef.current) return;

      // who may take the next turn, in the order the turn passes: that voice and the ones that
      // follow it round the ring, and Cartesia AI closing the ring — each of them once
      const plan = [];
      const planned = new Set();
      let candidate = first;
      for (let step = 0; step < TALK_IDS.length && candidate; step += 1) {
        if (planned.has(candidate.id) || triedRef.current.has(candidate.id)) break;
        plan.push({ ...candidate, which: TALK });
        planned.add(candidate.id);
        candidate = await askServer(candidate.id, "");
        if (!callingRef.current) return;
      }
      if (!downRef.current) {
        plan.push({ which: CARTESIA, id: CARTESIA, label: CARTESIA_AI, account: "" });
      }

      // the call on air is hung up, and the plan is opened in the order it was built
      await closeVoice(from.which);
      if (!callingRef.current) return;
      // the answers before the change belonged to the voice standing down
      answersRef.current = 0;

      // the voice that refused the turn last, so what could not come through is named if none can
      let refusedLabel = "";
      for (const slot of plan) {
        const opened = await openVoice(slot.which, slot);
        // the person ended the call while this voice was opening
        if (!callingRef.current) return;

        if (opened.ok) {
          // the ring, and the name on the screen — which follows the call that actually opened
          if (slot.which === CARTESIA) {
            takenRef.current = 0;
            talkRef.current = { ...FIRST_TALK };
          } else {
            takenRef.current += 1;
            talkRef.current = { id: slot.id, label: slot.label, account: slot.account };
          }
          setCurrent(slot.which, slot.label);
          const answers = from.which === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS;
          setNotice(handoffNotice(from.label, slot.label, answers));
          return;
        }

        // the voice could not take the call: it is not offered the turn again in this call
        if (slot.which === TALK) triedRef.current.add(slot.id);
        else downRef.current = true;
        refusedLabel = slot.label;
      }

      // none of them could take the call: the voice that stood down takes it back, and the reason is
      // said plainly instead of the person being left in silence
      setCurrent(from.which, from.label);
      talkRef.current = before;
      takenRef.current = takenBefore;
      const back = await openVoice(from.which, from);
      if (!callingRef.current) return;
      setNotice(
        back.ok
          ? refusedLabel
            ? `${refusedLabel} couldn't take over — ${from.label} is carrying on.`
            : noSignalNotice(from.label)
          : `${from.label} couldn't take the call back — tap the phone to talk again.`
      );
    } finally {
      // a change that could not finish never leaves the rotation wedged
      turningRef.current = false;
    }
  }, [askServer, closeVoice, nextTalk, openVoice, setCurrent, whoIsOn]);

  // the change is sent by an answer's own handler, so it is reachable from there
  useEffect(() => {
    handoffRef.current = handoff;
  }, [handoff]);

  const clearChange = useCallback(() => {
    dueRef.current = false;
    clearTimeout(dueTimerRef.current);
    dueTimerRef.current = 0;
    signalRef.current = null;
  }, []);

  const start = useCallback(
    async ({ onAnswered: charge } = {}) => {
      if (charge) chargeRef.current = charge;
      callingRef.current = true;
      turningRef.current = false;
      answersRef.current = 0;
      takenRef.current = 0;
      downRef.current = false;
      triedRef.current = new Set();
      clearChange();
      setNotice("");
      // every call opens on Cartesia AI; the older talk AIs take the call once it has given its
      // seven answers
      talkRef.current = { ...FIRST_TALK };
      setCurrent(CARTESIA, CARTESIA_AI);
      const opened = await openVoice(CARTESIA, { account: "", label: CARTESIA_AI });
      if (opened.ok) return true;

      // Cartesia AI could not take the call: the first talk AI opens it instead, and Cartesia is not
      // asked again during this call
      downRef.current = true;
      setCurrent(TALK, FIRST_TALK.label);
      const backup = await openVoice(TALK, FIRST_TALK);
      if (backup.ok) takenRef.current = 1;
      setNotice(
        backup.why ||
          opened.why ||
          `${CARTESIA_AI} couldn't take the call — ${FIRST_TALK.label} is on it.`
      );
      return backup.ok;
    },
    [clearChange, openVoice, setCurrent]
  );

  const stop = useCallback(async () => {
    callingRef.current = false;
    turningRef.current = false;
    answersRef.current = 0;
    clearChange();
    setNotice("");
    await closeVoice(holderRef.current);
  }, [clearChange, closeVoice]);

  /**
   * A written question is put to the older talk AIs, whichever voice is on the call: sent into the
   * call that is open, or answered on a short session of its own when no call is running. Its answer
   * is charged like any other, but it only counts against a turn while a talk AI really holds the
   * call — a line Cartesia AI opened never gave that answer.
   */
  const onWritten = useCallback(() => {
    if (holderRef.current !== TALK) {
      chargeRef.current?.();
      return;
    }
    onAnswered();
  }, [onAnswered]);

  const ask = useCallback(
    async (text, charge) => {
      if (charge) chargeRef.current = charge;
      return talk.ask(text, onWritten);
    },
    [talk, onWritten]
  );

  const active = holder === CARTESIA ? cartesia : talk;

  return {
    status: active.status,
    speaking: active.speaking,
    thinking: active.thinking,
    micActive: active.micActive,
    turns,
    error: active.error || "",
    notice: notice || active.notice || "",
    levelRef: active.levelRef,
    // who is answering now, written on the screen itself
    voiceLabel: voice,
    start,
    stop,
    ask,
  };
}