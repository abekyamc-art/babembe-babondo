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
  resumeNotice,
  waitNotice,
} from "@/lib/talkRotation";

/**
 * The home page's call, and who is on it.
 *
 * Cartesia AI opens every call and keeps it for as long as the person goes on talking: its answers
 * are never handed to another AI. The app's older talk AIs are reached only when Cartesia AI cannot
 * open the call, and between themselves they still take the call in turn — each on its own account
 * with its own key and its own agent, two questions at a time — so the ring keeps moving.
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
 * 3. The call on air is hung up, and the next voice waits: the person's own tap on the phone is what
 *    opens it, with the microphone, and the talk carries on from where it stood. Voices are opened in
 *    the order the turn passes, each once in a call — the name on the screen follows the call that
 *    actually opened, and when none can open the reason is said plainly instead of silence.
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
  // a voice has taken its turn and the next one is waiting for the person's own tap
  const [waiting, setWaiting] = useState(false);

  // the voice that holds the call, kept in a ref because the handlers that read it were handed to
  // the calls as they opened
  const holderRef = useRef(CARTESIA);
  // the talk AI on the call now, and how many talk turns have been taken since Cartesia AI last held
  // it — once each of them has had one, the call goes back to Cartesia AI
  const talkRef = useRef({ ...FIRST_TALK });
  // the talk AIs that have had their turn in the ring running now — once each of them has had one,
  // the call goes back to Cartesia AI
  const usedRef = useRef([]);
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
  // a call the service ended by itself is reported through here, so the turn it leaves behind is
  // never lost and the ring never falls back onto the AI that opened it
  const endedRef = useRef(null);
  // the voices waiting to take the call, and the voice they are taking it from — held while the
  // person's own tap is what opens the next one
  const pendingRef = useRef(null);

  // the whole talk is kept here, so a call that hands over carries the conversation with it and
  // nothing said before the change is lost from the screen
  const onTurn = useCallback((role, text) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  /**
   * The handoff signal, read and checked on the server. A signal that names nobody — or names the
   * voice already on the call, or an account whose key and agent are not both saved — is refused
   * there rather than guessed at, and the turn passes to the talk AI that follows in order. Where
   * even the server cannot be asked, nothing is guessed at: the turn is simply not moved, so no
   * signal can ever drop the talk back onto the AI the ring opened on.
   */
  const askServer = useCallback(async (fromId, reply) => {
    try {
      const res = await base44.functions.invoke("callHandoff", {
        reply: reply || "",
        from: fromId,
        // the AIs that have had their turn in this ring: the turn is never handed back to one of them
        used: usedRef.current,
      });
      const next = res?.data?.next;
      if (next?.id) return next;
    } catch (err) {
      // the turn is passed on in order instead
    }
    // nobody could be named: nothing is guessed at here, and never the AI the ring opened on
    return null;
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
   * One answer has been given, so it is charged. On Cartesia AI nothing else follows: it keeps the
   * call however long the person talks. On a talk AI the answer is counted against its two, and the
   * second only asks for the change: it is sent by that answer's own end, so the voice is never cut
   * off mid-sentence and the screen's state never decides when the call moves.
   */
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    // Cartesia AI keeps the call for as long as the person goes on talking: its answers are never
    // handed on, however many of them it has given
    if (holderRef.current === CARTESIA) return;
    if (!callingRef.current || turningRef.current || dueRef.current) return;
    answersRef.current += 1;
    if (answersRef.current >= TALK_ANSWERS) {
      dueRef.current = true;
      clearTimeout(dueTimerRef.current);
      dueTimerRef.current = setTimeout(dueHandoff, DRAIN_MAX_MS);
      return;
    }
    // the voice taking the next turn is asked for while this answer is still being given, so it is
    // already in hand the moment the last one ends
    if (answersRef.current === TALK_ANSWERS - 1 && !signalRef.current) {
      signalRef.current = nextTalk(whoIsOn());
    }
  }, [dueHandoff, nextTalk, whoIsOn]);

  const talk = useTalkVoice({ onTurn });
  const cartesia = useCartesiaVoice({
    onTurn,
    onAnswered,
    onAnswerEnd: dueHandoff,
    onEnded: () => endedRef.current?.(),
  });

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
              onEnded: () => endedRef.current?.(),
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
   * The change itself: who takes the next turn is decided here, while the answer before the last one
   * is still being given, and the call on air is then hung up. The voice taking the next turn waits
   * for the person's own tap on the phone — the plan built here is what that tap opens, in the order
   * the turn passes and each voice once in a call — and the talk so far stays on the screen and goes
   * with the new call.
   */
  const handoff = useCallback(async () => {
    if (turningRef.current) return;
    turningRef.current = true;
    try {
      const from = whoIsOn();

      // The talk AIs take the call in turn — they only, so the voice that opened the call is never
      // handed the turn again by a tap. Once each of them has had one the ring starts a fresh round:
      // the AI that has just finished stands aside and the one that follows it takes the next turn,
      // so a tap after a turn always opens the next AI in the sequence and never the first one.
      if (from.which === TALK && usedRef.current.length >= TALK_IDS.length) {
        usedRef.current = [from.id];
      }

      // the voice the signal named — asked for while the answer before the last one was still being
      // given — or, where it named nobody, the one that follows in order
      const asked = signalRef.current;
      signalRef.current = null;
      const first = await (asked || nextTalk(from));
      // the person ended the call while the signal was on its way
      if (!callingRef.current) return;
      // nobody could be named: the call stays exactly where it is, rather than dropping back onto the
      // AI the ring opened on
      if (!first) {
        setNotice(noSignalNotice(from.label));
        return;
      }

      // who may take the next turn, in the order the ring runs: the voice the signal named and the
      // ones that follow it, each of them once — anyone who has already had a turn is passed over
      const plan = [];
      const planned = new Set();
      let candidate = first;
      for (let step = 0; step < TALK_IDS.length && candidate; step += 1) {
        const id = candidate.id;
        // a voice that has already had its turn in this ring, or that could not take the call
        // earlier in it, is passed over — the ring still walks on from it in order
        if (!planned.has(id) && !triedRef.current.has(id) && !usedRef.current.includes(id)) {
          plan.push({ ...candidate, which: TALK });
        }
        planned.add(id);
        candidate = await askServer(id, "");
        if (!callingRef.current) return;
      }
      // the call on air is hung up here, and the next voice waits: the person's own tap on the phone
      // is what opens it, with the microphone, so a call that has taken its turn never speaks on
      // into an empty room
      await closeVoice(from.which);
      if (!callingRef.current) return;
      // the answers before the change belonged to the voice standing down
      answersRef.current = 0;
      pendingRef.current = { plan, from };
      setWaiting(true);
      const next = plan[0] || from;
      setVoice(next.label);
      setNotice(
        resumeNotice(
          from.label,
          next.label,
          from.which === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS
        )
      );
    } finally {
      // a change that could not finish never leaves the rotation wedged
      turningRef.current = false;
    }
  }, [askServer, closeVoice, nextTalk, whoIsOn]);

  // the change is sent by an answer's own handler, so it is reachable from there
  useEffect(() => {
    handoffRef.current = handoff;
  }, [handoff]);

  /**
   * The person's own tap after a handoff: the next voice in the ring opens, the microphone with it,
   * and the talk carries on from where it stood — no voice is asked for twice in one call. A voice
   * that cannot open is named plainly rather than the call going quietly nowhere.
   */
  const resume = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return false;
    pendingRef.current = null;
    setWaiting(false);

    let refusedLabel = "";
    for (const slot of pending.plan) {
      const opened = await openVoice(slot.which, slot);
      if (!opened.ok) {
        // the voice could not take the call: it is not offered the turn again in this call
        refusedLabel = slot.label;
        if (slot.which === TALK) triedRef.current.add(slot.id);
        else downRef.current = true;
        continue;
      }

      // the ring, and the name on the screen — which follows the call that actually opened
      if (slot.which === CARTESIA) {
        // Cartesia AI holds the call again, so the ring starts over from the first talk AI
        usedRef.current = [];
        talkRef.current = { ...FIRST_TALK };
      } else {
        if (!usedRef.current.includes(slot.id)) usedRef.current = [...usedRef.current, slot.id];
        talkRef.current = { id: slot.id, label: slot.label, account: slot.account };
      }
      setCurrent(slot.which, slot.label);
      setNotice(
        handoffNotice(
          pending.from.label,
          slot.label,
          pending.from.which === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS
        )
      );
      return true;
    }

    // none of them could open: nothing is guessed at, and the person is told plainly what to do
    setNotice(
      refusedLabel
        ? `${refusedLabel} couldn't take the call — tap the phone to try again.`
        : "Tap the phone to talk again."
    );
    return false;
  }, [openVoice, setCurrent]);

  const clearChange = useCallback(() => {
    dueRef.current = false;
    clearTimeout(dueTimerRef.current);
    dueTimerRef.current = 0;
    signalRef.current = null;
  }, []);

  /**
   * A call the service ended by itself — the quiet after an answer, or a session the service closed.
   * What is left behind is a turn end like any other, so the ring is never reset by it: a voice that
   * has given all its answers has taken its turn and the ring moves on exactly as it does at the end
   * of one; a voice that still owes answers keeps the call, and either way it is the person's own tap
   * that opens the next one.
   */
  const endedTurn = useCallback(() => {
    if (!callingRef.current || turningRef.current || pendingRef.current) return;
    const from = whoIsOn();
    clearChange();
    // Cartesia AI keeps the call: one it ended itself waits behind the tap on Cartesia AI, and is
    // never handed to another AI — only a talk AI that owes no more answers passes the turn on
    if (from.which === TALK && answersRef.current >= TALK_ANSWERS) {
      handoffRef.current?.();
      return;
    }
    // the turn is not over: the same AI waits behind the tap, with the answers it still owes
    pendingRef.current = {
      plan: [{ which: from.which, id: from.id, label: from.label, account: from.account }],
      from,
    };
    setWaiting(true);
    setVoice(from.label);
    setNotice(waitNotice(from.label));
  }, [clearChange, whoIsOn]);

  // the end of a call is reported by the voice itself, so it is reachable from there
  useEffect(() => {
    endedRef.current = endedTurn;
  }, [endedTurn]);

  const start = useCallback(
    async ({ onAnswered: charge } = {}) => {
      if (charge) chargeRef.current = charge;
      // a voice is waiting after a handoff: the tap opens the next one in the ring, so the call
      // carries on from where it stood instead of starting over
      if (pendingRef.current) return resume();
      callingRef.current = true;
      turningRef.current = false;
      answersRef.current = 0;
      usedRef.current = [];
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
      if (backup.ok) usedRef.current = [FIRST_TALK.id];
      setNotice(
        backup.why ||
          opened.why ||
          `${CARTESIA_AI} couldn't take the call — ${FIRST_TALK.label} is on it.`
      );
      return backup.ok;
    },
    [clearChange, openVoice, resume, setCurrent]
  );

  const stop = useCallback(async () => {
    callingRef.current = false;
    turningRef.current = false;
    answersRef.current = 0;
    clearChange();
    // a call the person ended is a call with nothing waiting in it
    pendingRef.current = null;
    setWaiting(false);
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
    // the call has handed over and the next voice is waiting for the person's own tap
    waiting,
    start,
    stop,
    ask,
  };
}