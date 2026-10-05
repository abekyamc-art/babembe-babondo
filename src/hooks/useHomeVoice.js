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
 * The home page's call, and who is on it — the rotation the calls have always used.
 *
 * Cartesia AI opens every call and answers seven questions; the app's older talk AIs then take the
 * call in turn, each on its own account with its own key and its own agent, and each answering two
 * questions before the turn is passed on. Once they have all had a turn Cartesia AI is handed the
 * call back, so the ring keeps moving and the person keeps talking without ever starting the next
 * voice themselves: the call on air is hung up and the next one opens straight away.
 *
 * The handover itself has three rules, and all three are what make the rotation actually move:
 *
 * 1. It is sent once the answer that asked for it has been read out in full, so no voice is ever cut
 *    off mid-sentence.
 * 2. The next voice is asked for while the answer before the last one is still being given, so the
 *    handover does not sit waiting on a signal when the moment comes.
 * 3. A signal that names nobody is never a dead end: it is read on the server all the same, where
 *    the turn passes to the talk AI that follows in order, and the app passes it on in order itself
 *    where even that could not be asked for. The talk always moves on to another voice, and a voice
 *    that cannot open is never offered the same turn twice.
 */

const CARTESIA = "cartesia";
const TALK = "talk";

// The breath a handover waits once the answer asking for it has been read out, and the moment an
// answer is given to begin its voice before the handover stops waiting for it.
const HANDOFF_BREATH_MS = 500;
const ANSWER_LEAD_MS = 2500;

export default function useHomeVoice() {
  const [turns, setTurns] = useState([]);
  // who is on the call right now, written on the screen itself
  const [holder, setHolder] = useState(CARTESIA);
  const [voice, setVoice] = useState(CARTESIA_AI);
  const [notice, setNotice] = useState("");
  // the handover the last answer asked for: sent once that answer has been read out
  const [due, setDue] = useState(false);

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
  // while the handover is running is counted
  const callingRef = useRef(false);
  const turningRef = useRef(false);
  // what an answer is charged through, and the handover itself, each kept in a ref because the
  // handlers that send them are handed to the calls as they open
  const chargeRef = useRef(null);
  const handoffRef = useRef(null);
  // an outside AI that could not take the call is not asked again during the same call
  const downRef = useRef(false);
  // the voices that could not take the call in this one: their turn is never offered to them twice
  const triedRef = useRef(new Set());
  // the signal asked for while the answer before the last one was still being given
  const signalRef = useRef(null);
  // whether the voice of the answer now due has begun, so a handover is never sent into the middle
  // of an answer only just begun
  const spokeRef = useRef(false);

  // the whole talk is kept here, so a call that hands over carries the conversation with it and
  // nothing said before the handover is lost from the screen
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
      let reply = "";
      try {
        reply = await askCoordinator(from.label);
      } catch (err) {
        reply = "";
      }
      return askServer(from.id, reply);
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
   * One answer has been given, so it is charged — and counted against the number whoever holds the
   * call answers before the next voice takes it: Cartesia AI seven, each talk AI two. The last of
   * those only asks for the handover, which is sent once that answer has been read out in full so
   * no voice is ever cut off mid-sentence.
   */
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    if (!callingRef.current || turningRef.current) return;
    const limit = holderRef.current === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS;
    answersRef.current += 1;
    if (answersRef.current >= limit) {
      spokeRef.current = false;
      setDue(true);
      return;
    }
    // the voice taking the next turn is asked for while this answer is still being given, so it is
    // already in hand the moment the last one ends
    if (answersRef.current === limit - 1 && !signalRef.current) {
      signalRef.current = nextTalk(whoIsOn());
    }
  }, [nextTalk, whoIsOn]);

  const talk = useTalkVoice({ onTurn });
  const cartesia = useCartesiaVoice({ onTurn, onAnswered });

  /** Who holds the call, written on screen and kept in a ref for the handlers sent out with it. */
  const setCurrent = useCallback((which, label) => {
    holderRef.current = which;
    setHolder(which);
    setVoice(label);
  }, []);

  /** The call opens on whoever holds it now, and says plainly when it cannot. */
  const openHolder = useCallback(async () => {
    const why =
      holderRef.current === CARTESIA
        ? await cartesia.start()
        : await talk.start({
            account: talkRef.current.account,
            label: talkRef.current.label,
            onAnswered,
          });
    return why ? { ok: false, why } : { ok: true, why: "" };
  }, [cartesia, talk, onAnswered]);

  const closeHolder = useCallback(async () => {
    if (holderRef.current === CARTESIA) await cartesia.stop();
    else await talk.stop();
  }, [cartesia, talk]);

  /**
   * The handover itself: the call on air is hung up and the next voice opens straight away — the
   * person never starts it themselves, and the talk so far stays on the screen and goes with the new
   * call. A voice that cannot open has the turn passed on from it to the voice that follows, and only
   * where no other voice can open at all does the voice that stood down carry on, with the reason
   * said plainly rather than the person being left in silence.
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

      // the signal asked for while the answer before the last one was still being given is used
      // here; one that is not in hand was asked for too late and is asked for now
      const asked = signalRef.current;
      signalRef.current = null;
      let next = wantedTalk ? await (asked || nextTalk(from)) : null;
      // the person ended the call while the signal was being read
      if (!callingRef.current) return;

      // a voice that could not take the call earlier in this call is never offered the same turn
      // again: the turn passes to the voice that follows it
      if (next && triedRef.current.has(next.id)) {
        next = await askServer(next.id, "");
        if (!callingRef.current) return;
        if (next && triedRef.current.has(next.id)) next = null;
      }

      // nothing else to hand the call to at all: the voice on the line keeps it rather than the
      // call being hung up for a handover with nowhere to go
      if (wantedTalk && !next) {
        setNotice(noSignalNotice(from.label));
        return;
      }

      await closeHolder();
      if (!callingRef.current) return;
      // the answers before the change belonged to the voice standing down
      answersRef.current = 0;

      // the voice standing down takes the call straight back when the next one cannot open
      const backUp = async (why) => {
        setCurrent(from.which, from.label);
        talkRef.current = before;
        takenRef.current = takenBefore;
        setNotice(why);
        if (callingRef.current) await openHolder();
      };

      // the older talk AIs have all had their turn: Cartesia AI takes the call back for its seven
      if (!next) {
        takenRef.current = 0;
        setCurrent(CARTESIA, CARTESIA_AI);
        setNotice(handoffNotice(from.label, CARTESIA_AI, TALK_ANSWERS));
        const opened = await openHolder();
        if (opened.ok) return;
        downRef.current = true;
        await backUp(opened.why || `${CARTESIA_AI} couldn't take over — ${from.label} is carrying on.`);
        return;
      }

      const answers = from.which === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS;
      takenRef.current += 1;
      setCurrent(TALK, next.label);
      talkRef.current = { id: next.id, label: next.label, account: next.account };
      setNotice(handoffNotice(from.label, next.label, answers));
      const opened = await openHolder();
      if (opened.ok) return;

      // the voice could not take the call: the turn passes to the voice that follows it, and only
      // where no other voice can open does the one that stood down carry on
      triedRef.current.add(next.id);
      const after = await askServer(next.id, "");
      if (!callingRef.current) return;
      if (!after || triedRef.current.has(after.id)) {
        await backUp(opened.why || `${next.label} couldn't take over — ${from.label} is carrying on.`);
        return;
      }
      takenRef.current += 1;
      setCurrent(TALK, after.label);
      talkRef.current = { id: after.id, label: after.label, account: after.account };
      setNotice(`${next.label} couldn't take over — ${after.label} is on the call now.`);
      const again = await openHolder();
      if (again.ok) return;
      triedRef.current.add(after.id);
      await backUp(again.why || `${after.label} couldn't take over — ${from.label} is carrying on.`);
    } finally {
      // a swap that could not finish never leaves the rotation wedged: the answer after it hands
      // over like any other
      turningRef.current = false;
    }
  }, [askServer, closeHolder, nextTalk, openHolder, setCurrent, whoIsOn]);

  // the handover is sent by an answer's own handler, so it is reachable from there
  useEffect(() => {
    handoffRef.current = handoff;
  }, [handoff]);

  const active = holder === CARTESIA ? cartesia : talk;

  // The handover the last answer asked for is sent here: the answer is read out in full first, the
  // call on air is hung up, and the next voice opens straight away — this is the hang-up and the
  // start that move the rotation, and the person never starts it themselves.
  useEffect(() => {
    if (!due) return undefined;
    // the voice is still reading the answer out: the handover waits for it to finish
    if (active.speaking) {
      spokeRef.current = true;
      return undefined;
    }
    // an answer whose voice has not begun yet is given its moment to begin before the wait is over
    const hold = spokeRef.current ? HANDOFF_BREATH_MS : ANSWER_LEAD_MS;
    const id = setTimeout(() => {
      setDue(false);
      handoffRef.current?.();
    }, hold);
    return () => clearTimeout(id);
  }, [due, active.speaking, active.status, active.thinking, turns]);

  const start = useCallback(
    async ({ onAnswered: charge } = {}) => {
      if (charge) chargeRef.current = charge;
      callingRef.current = true;
      turningRef.current = false;
      answersRef.current = 0;
      takenRef.current = 0;
      downRef.current = false;
      triedRef.current = new Set();
      signalRef.current = null;
      spokeRef.current = false;
      setDue(false);
      setNotice("");
      // every call opens on Cartesia AI; the older talk AIs take the call once it has given its
      // seven answers
      talkRef.current = { ...FIRST_TALK };
      setCurrent(CARTESIA, CARTESIA_AI);
      const opened = await openHolder();
      if (opened.ok) return true;

      // Cartesia AI could not take the call: the first talk AI opens it instead, and Cartesia is not
      // asked again during this call
      downRef.current = true;
      setCurrent(TALK, FIRST_TALK.label);
      const backup = await openHolder();
      if (backup.ok) takenRef.current = 1;
      setNotice(
        backup.why ||
          opened.why ||
          `${CARTESIA_AI} couldn't take the call — ${FIRST_TALK.label} is on it.`
      );
      return backup.ok;
    },
    [openHolder, setCurrent]
  );

  const stop = useCallback(async () => {
    callingRef.current = false;
    turningRef.current = false;
    answersRef.current = 0;
    signalRef.current = null;
    spokeRef.current = false;
    setDue(false);
    setNotice("");
    await closeHolder();
  }, [closeHolder]);

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