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
 * questions before the coordinator is asked whose turn comes next. Once they have all had a turn
 * Cartesia AI is handed the call back, so the whole ring keeps moving and the person keeps talking
 * without ever starting the next AI themselves — each call is hung up before the next one opens, and
 * a voice that cannot take the call is said plainly instead of leaving the person in silence.
 *
 * This is the rotation the calls have always used: the talk AIs take turns in the order the app is
 * set up with, and a handoff is a change of AI and never a change of voice on someone else's account.
 */

const CARTESIA = "cartesia";
const TALK = "talk";

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
  // while the handover is running is counted
  const callingRef = useRef(false);
  const turningRef = useRef(false);
  // what an answer is charged through, and the handover itself, each kept in a ref because the
  // handlers that send them are handed to the calls as they open
  const chargeRef = useRef(null);
  const handoffRef = useRef(null);
  // an outside AI that could not take the call is not asked again during the same call
  const downRef = useRef(false);

  // the whole talk is kept here, so a call that hands over carries the conversation with it and
  // nothing said before the handover is lost from the screen
  const onTurn = useCallback((role, text) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  // an answer has been given, so it is charged — and counted against the number whoever holds the
  // call answers before the next AI takes it: Cartesia AI seven, each older talk AI two
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    if (!callingRef.current || turningRef.current) return;
    const limit = holderRef.current === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS;
    answersRef.current += 1;
    if (answersRef.current < limit) return;
    answersRef.current = 0;
    handoffRef.current?.();
  }, []);

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
   * The talk AI the coordinator named: it is asked in writing whose turn the next two questions are,
   * and what it names is read on the server against the accounts the app is set up with. A signal
   * that cannot be asked for or read is no signal at all, and the turn then passes in order.
   */
  const nextTalk = useCallback(async (from) => {
    try {
      const reply = await askCoordinator(from.label);
      if (!reply) return null;
      const res = await base44.functions.invoke("callHandoff", { reply, from: from.id });
      return res?.data?.next || null;
    } catch (err) {
      return null;
    }
  }, []);

  /**
   * The handover. Whoever holds the call is hung up before the next voice opens, so the two are
   * never both listening in the same room; where the next voice cannot open at all the person is
   * never left in silence — the voice that stood down takes the call straight back, and the reason
   * is said plainly.
   */
  const handoff = useCallback(async () => {
    if (turningRef.current) return;
    turningRef.current = true;
    try {
      const from = holderRef.current;
      const fromLabel = from === CARTESIA ? CARTESIA_AI : talkRef.current.label;
      const fromId = from === CARTESIA ? CARTESIA : talkRef.current.id;
      const before = { ...talkRef.current };
      const takenBefore = takenRef.current;

      // each older talk AI takes the call in turn, and Cartesia AI is handed it back once they have
      // each had one — its own turn is what starts the ring round again. With Cartesia AI down for
      // this call the ring simply carries on among the talk AIs.
      const ringDone = from === TALK && takenRef.current >= TALK_IDS.length;
      const wantedTalk = from === CARTESIA || !ringDone || downRef.current;

      const next = wantedTalk ? await nextTalk({ id: fromId, label: fromLabel }) : null;
      // the person ended the call while the signal was being read
      if (!callingRef.current) return;

      // nothing else to hand the call to at all: the voice on the line keeps it rather than the call
      // being hung up for a handover that has nowhere to go
      if (!next && (from === CARTESIA || downRef.current)) {
        setNotice(noSignalNotice(fromLabel));
        return;
      }

      await closeHolder();
      if (!callingRef.current) return;
      // the answers before the change belonged to the voice standing down
      answersRef.current = 0;

      // the voice standing down takes the call straight back when the next one cannot open
      const backUp = async (why) => {
        setCurrent(from, fromLabel);
        talkRef.current = before;
        takenRef.current = takenBefore;
        setNotice(why);
        if (callingRef.current) await openHolder();
      };

      // the older talk AIs have all had their turn: Cartesia AI takes the call back for its seven
      if (!next) {
        takenRef.current = 0;
        setCurrent(CARTESIA, CARTESIA_AI);
        setNotice(handoffNotice(fromLabel, CARTESIA_AI, TALK_ANSWERS));
        const opened = await openHolder();
        if (opened.ok) return;
        downRef.current = true;
        await backUp(opened.why || `${CARTESIA_AI} couldn't take over — ${fromLabel} is carrying on.`);
        return;
      }

      const answers = from === CARTESIA ? CARTESIA_ANSWERS : TALK_ANSWERS;
      setCurrent(TALK, next.label);
      talkRef.current = { id: next.id, label: next.label, account: next.account };
      setNotice(handoffNotice(fromLabel, next.label, answers));
      const opened = await openHolder();
      if (opened.ok) {
        takenRef.current += 1;
        return;
      }
      // the next talk AI could not open: the voice that stood down takes the call back
      await backUp(opened.why || `${next.label} couldn't take over — ${fromLabel} is carrying on.`);
    } finally {
      // a swap that could not finish never leaves the rotation wedged: the answer after it hands
      // over like any other
      turningRef.current = false;
    }
  }, [closeHolder, nextTalk, openHolder, setCurrent]);

  // the handover is sent by an answer's own handler, so it is reachable from there
  useEffect(() => {
    handoffRef.current = handoff;
  }, [handoff]);

  const start = useCallback(
    async ({ onAnswered: charge } = {}) => {
      if (charge) chargeRef.current = charge;
      callingRef.current = true;
      turningRef.current = false;
      answersRef.current = 0;
      takenRef.current = 0;
      downRef.current = false;
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
    setNotice("");
    await closeHolder();
  }, [closeHolder]);

  /**
   * A written question is put to the older talk AIs, whichever AI is on the call: sent into the call
   * that is open, or answered on a short session of its own when no call is running. Its answer is
   * charged like any other, but it only counts against a turn while a talk AI really holds the call —
   * a line Cartesia AI opened never gave that answer.
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