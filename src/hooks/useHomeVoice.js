import { useCallback, useEffect, useRef, useState } from "react";
import useTalkVoice from "@/hooks/useTalkVoice";
import useCartesiaVoice from "@/hooks/useCartesiaVoice";
import { HOME_SEATS, nextPlan } from "@/lib/homeRotation";
import { keepHeard, proposeHeard } from "@/lib/homeHearing";
import { handoffNotice, resumeNotice, waitNotice } from "@/lib/talkRotation";

/**
 * The home page's call, and who is on it.
 *
 * Every voice the app is set up with takes the call in turn: Cartesia AI opens it, then the app's
 * older talk AIs in their own order, then the accounts that speak for the other modes — Mbembe AI,
 * Mbondo AI and Sadiki AI — and when the ring is complete it starts over, so the talk keeps moving
 * from one voice to the next for as long as the call runs. Each voice answers its own number of
 * finished answers and then stands aside: Cartesia AI seven, every other voice two.
 *
 * What makes the change land is that it is a plain sequence of events, not a reading of the screen:
 *
 * 1. The last answer of a voice's turn asks for the change; the voice itself reports the moment that
 *    answer has been read out, and that report is what sends the change — so no voice is cut off
 *    mid-sentence, and nothing about the screen's state decides when the call moves.
 * 2. The call on air is hung up, and the next voice waits: the person's own tap on the phone is what
 *    opens it, with the microphone, and the talk carries on from where it stood. The talk so far
 *    stays on the screen and goes with the new call.
 * 3. A voice that has not been set up, or that cannot open, is passed over and the next one in the
 *    ring is tried, so the call always opens on whichever voice the app has available; and a voice
 *    that could not open is not offered the turn again during the same call.
 */

// The longest the answer that asked for the change is given to finish being read out. The answer's
// own end is what sends the change — this only stops a call whose end was never reported from
// sitting on a voice that has already taken its turn.
const DRAIN_MAX_MS = 30000;

export default function useHomeVoice() {
  const [turns, setTurns] = useState([]);
  // the voice holding the call, and the name the screen writes — which after a handoff already names
  // the voice the person's next tap opens
  const [seat, setSeat] = useState(HOME_SEATS[0]);
  const [label, setLabel] = useState(HOME_SEATS[0].label);
  const [notice, setNotice] = useState("");
  // a voice has taken its turn and the next one is waiting for the person's own tap
  const [waiting, setWaiting] = useState(false);
  // what the app would keep from a turn the person has put right, waiting for their own answer
  const [saveAsk, setSaveAsk] = useState(null);

  // the voice holding the call, kept in a ref because the handlers that read it were handed to the
  // calls as they opened
  const seatRef = useRef(HOME_SEATS[0]);
  // the finished answers given by the voice holding the call now
  const answersRef = useRef(0);
  // a call is on air, and is being handed over: neither a turn taken outside a call nor one taken
  // while the change is running is counted
  const callingRef = useRef(false);
  const turningRef = useRef(false);
  // a call is opening right now: a tap that lands on it is never a second call
  const startingRef = useRef(false);
  // what an answer is charged through, and the change itself, each kept in a ref because the handlers
  // that send them are handed to the calls as they open
  const chargeRef = useRef(null);
  const handoffRef = useRef(null);
  // the change the last answer asked for, and the guard that sends it if that answer's end is never
  // reported
  const dueRef = useRef(false);
  const dueTimerRef = useRef(0);
  // a call the service ended by itself is reported through here, so the turn it leaves behind is
  // never lost
  const endedRef = useRef(null);
  // the voices waiting to take the call, and the voice they are taking it from — held while the
  // person's own tap is what opens the next one
  const pendingRef = useRef(null);
  // the voices that could not open a call in this one: their turn is never offered to them twice
  const triedRef = useRef([]);
  // the voices that have already taken their turn in this call: the ring goes right round every
  // voice it still holds before it comes back to one of them, so a call never returns to a voice it
  // has just left
  const usedRef = useRef([]);
  // the hang-up the change is running right now: the person's tap waits on it before the next voice
  // is opened, so the voice standing down is released first and two voices are never on the line
  // at the same time
  const handingRef = useRef(null);

  // the whole talk is kept here, so a call that hands over carries the conversation with it and
  // nothing said before the change is lost from the screen
  const onTurn = useCallback((role, text) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  /** The voice on the call right now, named on screen and read by the handlers sent out with it. */
  const setCurrent = useCallback((next) => {
    seatRef.current = next;
    setSeat(next);
    setLabel(next.label);
    // this voice has had its turn: the ring will not offer it the call again until every other voice
    // still in the ring has had a turn as well
    if (!usedRef.current.includes(next.id)) usedRef.current = [...usedRef.current, next.id];
  }, []);

  /**
   * The change the last answer asked for, sent the moment that answer has been read out in full. The
   * voice reports its own end, so the call moves on that report and never on a reading of the screen.
   * It runs once and only once.
   */
  const dueHandoff = useCallback(() => {
    if (!dueRef.current) return;
    dueRef.current = false;
    clearTimeout(dueTimerRef.current);
    dueTimerRef.current = 0;
    handoffRef.current?.();
  }, []);

  /**
   * One answer has been given, so it is charged. The voice keeps the call until its own number of
   * answers has been read out; the last of them only asks for the change, and the change is sent by
   * that answer's own end, so no voice is ever cut off mid-sentence.
   */
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    // a change is already under way, or the call is paused on one: an answer counted here would
    // belong to the voice standing down instead of the one taking the call, whose count starts at
    // nothing
    if (!callingRef.current || turningRef.current || pendingRef.current || dueRef.current) return;
    answersRef.current += 1;
    if (answersRef.current < seatRef.current.answers) return;
    dueRef.current = true;
    clearTimeout(dueTimerRef.current);
    dueTimerRef.current = setTimeout(dueHandoff, DRAIN_MAX_MS);
  }, [dueHandoff]);

  const talk = useTalkVoice({ onTurn });
  const cartesia = useCartesiaVoice({
    onTurn,
    onAnswered,
    onAnswerEnd: dueHandoff,
    onEnded: () => endedRef.current?.(),
  });

  /** The voice one seat stands for opens the call, and says plainly whether it did. */
  const openSeat = useCallback(
    async (next) => {
      const why =
        next.kind === "cartesia"
          ? await cartesia.start({ account: next.account, label: next.label })
          : await talk.start({
              account: next.account,
              label: next.label,
              onAnswered,
              onAnswerEnd: dueHandoff,
              onEnded: () => endedRef.current?.(),
            });
      return why ? { ok: false, why } : { ok: true, why: "" };
    },
    [cartesia, talk, onAnswered, dueHandoff]
  );

  /** The call on air, hung up. */
  const closeSeat = useCallback(
    async (next) => {
      if (next.kind === "cartesia") await cartesia.stop();
      else await talk.stop();
    },
    [cartesia, talk]
  );

  /**
   * The change itself: the voice that takes the next turn is the one that follows this voice in the
   * ring, the call on air is hung up, and the next voice waits for the person's own tap on the phone.
   * The talk so far stays on the screen and goes with the new call, so nothing said before the change
   * is lost from it.
   */
  const handoff = useCallback(async () => {
    // a change is already running, or the next voice is already waiting behind the person's tap
    if (turningRef.current || pendingRef.current) return;
    turningRef.current = true;
    const from = seatRef.current;
    // the voices that may take the call next, in the order the ring runs, each of them once — the
    // ones still waiting for their turn, so the call moves on to a voice that has not spoken yet
    const { plan, fresh } = nextPlan(from.id, triedRef.current, usedRef.current);
    // every voice the ring holds has taken its turn: the round is complete, and the ring starts over
    if (!fresh) usedRef.current = [];
    // The voice taking the next turn is chosen and waiting from the moment the change begins — and
    // the count starts again from nothing, since the answers so far belonged to the voice standing
    // down. Choosing it here is what keeps a tap that lands while the call is being hung up from
    // opening a second call on top of the voice that is standing down.
    const next = plan[0];
    answersRef.current = 0;
    pendingRef.current = { next, plan, from };
    setWaiting(true);
    setLabel(next.label);
    setNotice(resumeNotice(from.label, next.label, from.answers));
    // The call on air is hung up here, and the change stays under way until the voice behind the
    // person's tap has opened: that tap waits on this hang-up before it opens anything, so the voice
    // standing down is released first and the two are never on the line at once.
    handingRef.current = closeSeat(from);
    try {
      await handingRef.current;
    } catch (err) {
      // a hang-up that could not finish never leaves the call wedged
    } finally {
      handingRef.current = null;
    }
    // the person ended the call while it was being hung up: nothing is left waiting
    if (!callingRef.current) {
      pendingRef.current = null;
      setWaiting(false);
      setNotice("");
      turningRef.current = false;
    }
  }, [closeSeat]);

  // the change is sent by an answer's own handler, so it is reachable from there
  useEffect(() => {
    handoffRef.current = handoff;
  }, [handoff]);

  /**
   * The person's own tap after a handoff: the next voice in the ring opens, with the microphone, and
   * the talk carries on from where it stood. A voice that cannot open is passed over for the rest of
   * the call and the one after it is tried; where none of them can open, the person is told plainly
   * rather than the call going quietly nowhere.
   */
  const resume = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return false;
    pendingRef.current = null;
    setWaiting(false);

    try {
      // the voice that was holding the call is hung up before the next one opens, so no two voices
      // are ever on the line at once
      if (handingRef.current) {
        try {
          await handingRef.current;
        } catch (err) {
          // the hang-up was given up on: the call still moves on rather than sitting still
        }
      }
      // the person ended the call while it was being hung up
      if (!callingRef.current) return false;

      // the voice the call selected while it was standing down is the one the person's tap starts;
      // the rest of the ring is only the fallback for a voice that cannot open at all
      const order = [pending.next, ...pending.plan.filter((seat) => seat.id !== pending.next.id)];

      let refused = "";
      for (const next of order) {
        const opened = await openSeat(next);
        if (!opened.ok) {
          refused = next.label;
          if (!triedRef.current.includes(next.id)) triedRef.current = [...triedRef.current, next.id];
          continue;
        }
        setCurrent(next);
        setNotice(handoffNotice(pending.from.label, next.label, pending.from.answers));
        return true;
      }

      // None of them could open — an account refused, a microphone another app is holding, a service
      // having a bad moment. Nothing is guessed at: the change is put back exactly where it stood,
      // every voice is offered the turn again, and the person is told plainly which voice refused and
      // that their own tap is what tries again. A call is never left with nothing on the line and
      // taps that do nothing.
      setLabel(pending.from.label);
      setWaiting(true);
      pendingRef.current = { next: pending.next, plan: pending.plan, from: pending.from };
      triedRef.current = [];
      setNotice(
        refused
          ? `${refused} couldn't take the call — tap the phone to try again.`
          : "Tap the phone to talk again."
      );
      return false;
    } finally {
      // the change is over: whoever holds the call now is the one answering
      turningRef.current = false;
    }
  }, [openSeat, setCurrent]);

  const clearChange = useCallback(() => {
    dueRef.current = false;
    clearTimeout(dueTimerRef.current);
    dueTimerRef.current = 0;
  }, []);

  /**
   * A call the service ended by itself — the quiet after an answer, or a session the service closed.
   * What is left behind is a turn end like any other: a voice that has given all its answers has taken
   * its turn and the ring moves on exactly as it does at the end of one; a voice that still owes
   * answers keeps the call, and either way it is the person's own tap that opens the next one.
   */
  const endedTurn = useCallback(() => {
    if (!callingRef.current || turningRef.current || pendingRef.current) return;
    const from = seatRef.current;
    clearChange();
    if (answersRef.current >= from.answers) {
      handoffRef.current?.();
      return;
    }
    // the turn is not over: the same voice waits behind the tap, with the answers it still owes
    pendingRef.current = { next: from, plan: [from], from };
    setWaiting(true);
    setLabel(from.label);
    setNotice(waitNotice(from.label));
  }, [clearChange]);

  // the end of a call is reported by the voice itself, so it is reachable from there
  useEffect(() => {
    endedRef.current = endedTurn;
  }, [endedTurn]);

  const start = useCallback(
    async ({ onAnswered: charge } = {}) => {
      if (charge) chargeRef.current = charge;

      // A call is opening, or one is already on air: that is the only call there is, so a tap that
      // lands on it never opens a second one. The one exception is the tap after a handoff, which
      // carries the change on by opening the voice the call has already chosen — that tap is not a
      // second call either, it is the one call moving to its next voice.
      if (startingRef.current) return false;
      if (callingRef.current) {
        if (pendingRef.current || turningRef.current) return resume();
        // A call with nothing on the line — no voice open and no change waiting to be taken — is a
        // call that went nowhere, so the tap opens a voice again instead of being swallowed.
        if (talk.micActive || cartesia.micActive) return false;
      }

      startingRef.current = true;
      callingRef.current = true;
      turningRef.current = false;
      answersRef.current = 0;
      triedRef.current = [];
      usedRef.current = [];
      clearChange();
      setNotice("");
      setWaiting(false);
      setLabel(HOME_SEATS[0].label);

      // The call opens on Cartesia AI. A voice that cannot open is passed over and the next one in
      // the ring is tried, so the call opens on whichever voice the app has available — and a voice
      // that could not open is not offered the turn again for the rest of this call.
      for (const next of HOME_SEATS) {
        const opened = await openSeat(next);
        if (opened.ok) {
          startingRef.current = false;
          setCurrent(next);
          if (next.id !== HOME_SEATS[0].id) {
            setNotice(`${HOME_SEATS[0].label} couldn't take the call — ${next.label} is on it.`);
          }
          return true;
        }
        if (!triedRef.current.includes(next.id)) triedRef.current = [...triedRef.current, next.id];
      }

      // no voice could open the call at all
      startingRef.current = false;
      callingRef.current = false;
      setCurrent(HOME_SEATS[0]);
      setNotice("The call couldn't start — tap the phone and try again.");
      return false;
    },
    [cartesia, clearChange, openSeat, resume, setCurrent, talk]
  );

  const stop = useCallback(async () => {
    startingRef.current = false;
    callingRef.current = false;
    turningRef.current = false;
    answersRef.current = 0;
    clearChange();
    // a call the person ended is a call with nothing waiting in it
    pendingRef.current = null;
    triedRef.current = [];
    usedRef.current = [];
    setWaiting(false);
    setNotice("");
    await closeSeat(seatRef.current);
  }, [clearChange, closeSeat]);

  /**
   * A written question is always charged, but it never counts against a voice's turn: what moves the
   * call on is the answers a voice really spoke, so a typed exchange leaves the turn where it was.
   */
  const onWritten = useCallback(() => {
    chargeRef.current?.();
  }, []);

  const ask = useCallback(
    async (text, charge) => {
      if (charge) chargeRef.current = charge;
      return talk.ask(text, onWritten);
    },
    [talk, onWritten]
  );

  /**
   * The person puts the app's own writing of one of their turns right: what they really said takes
   * the place of what the ears wrote for that turn, and the voice holding the call is handed those
   * words, so the answer that comes is an answer to what they actually said.
   */
  const correctTurn = useCallback(
    (at, text, wasHeard) => {
      const said = String(text || "").trim();
      if (!said) return;
      setTurns((prev) =>
        prev.map((turn, index) => (index === at ? { ...turn, text: said } : turn))
      );
      const live = seatRef.current.kind === "cartesia" ? cartesia : talk;
      live.correct?.(said);

      // The app offers to keep what the person put right — their own words in place of what the ears
      // wrote for that turn — and nothing goes into the Word Bank until they answer the offer.
      proposeHeard(said, wasHeard).then((proposal) => {
        if (proposal) setSaveAsk({ ...proposal, text: said, heard: String(wasHeard || "") });
      });
    },
    [cartesia, talk]
  );

  /** The person has said the offer should be kept: their own words go into the Word Bank now. */
  const keepSave = useCallback(async () => {
    const ask = saveAsk;
    setSaveAsk(null);
    if (!ask) return;
    const kept = await keepHeard(ask.text, ask.heard);
    if (kept) setNotice(`"${kept}" is kept in the Word Bank.`);
  }, [saveAsk]);

  /** They left the offer: nothing is written, and the turn stays as they put it. */
  const leaveSave = useCallback(() => setSaveAsk(null), []);

  // whichever voice holds the call is the one whose state the screen reads
  const live = seat.kind === "cartesia" ? cartesia : talk;

  return {
    status: live.status,
    speaking: live.speaking,
    thinking: live.thinking,
    micActive: live.micActive,
    turns,
    error: live.error || "",
    // what the voice answering says about the turn being made has the floor, so a turn it could not
    // read is said plainly even where a handoff has left its own line on the screen
    notice: live.notice || notice || "",
    levelRef: live.levelRef,
    // who is answering now, written on the screen itself
    voiceLabel: label,
    // the call has handed over and the next voice is waiting for the person's own tap
    waiting,
    start,
    stop,
    ask,
    // the person's own words put in place of the app's writing of their turn
    correctTurn,
    // what the app would keep from those words, and the person's own answer to the offer
    saveAsk,
    keepSave,
    leaveSave,
  };
}