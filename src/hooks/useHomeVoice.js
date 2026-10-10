import { useCallback, useEffect, useRef, useState } from "react";
import useTalkVoice from "@/hooks/useTalkVoice";
import useCartesiaVoice from "@/hooks/useCartesiaVoice";
import useOpenAiVoice from "@/hooks/useOpenAiVoice";
import useHomeMedia from "@/hooks/useHomeMedia";
import { BASE44_SEAT_ID, HOME_SEATS, nextPlan } from "@/lib/homeRotation";
import { checkVoiceSeats } from "@/lib/voiceHealth";
import { keepHeard, proposeHeard } from "@/lib/homeHearing";
import {
  handoffNotice,
  musicHandoffNotice,
  refusedNotice,
  resumeNotice,
  stuckNotice,
  waitNotice,
} from "@/lib/talkRotation";

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

/**
 * The ring's seat, named by whoever really took the call rather than by who it was expected to be.
 * The Cartesia seat is three accounts behind one name, so which of them answered is only known from
 * the seat itself once the call has opened.
 */
const liveSeat = (next, opened) => (opened?.label ? { ...next, label: opened.label } : next);

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
  // A turn the voice on the line took and never began answering is reported through here. It is kept
  // in a ref because the calls were handed the handler as they opened, and the voice that reports it
  // is not the one that decides what takes it next.
  const stuckRef = useRef(null);
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
  // the change's own end, reachable from the change itself: a set that ends opens the voice behind it
  // without waiting for a tap
  const resumeRef = useRef(null);

  // the whole talk is kept here, so a call that hands over carries the conversation with it and
  // nothing said before the change is lost from the screen
  const onTurn = useCallback((role, text, pictures, source, choices, videos) => {
    setTurns((prev) => [
      ...prev,
      {
        role,
        text,
        pictures: pictures || [],
        source: source || null,
        choices: choices || [],
        // the artist's own most watched videos, when the answer named them: they stand under the
        // answer on the screen as well as being written in the answer's own words
        videos: videos || [],
      },
    ]);
  }, []);

  /**
   * The pictures the admin saved beside the words of an answer, arriving a moment after the answer
   * itself: the newest line of the talk that answer is found by, and the pictures are added to it. So
   * the words are never held back while a picture is found, and an answer whose words carry no
   * picture is left exactly as it stands.
   */
  const patchPictures = useCallback((text, pictures) => {
    setTurns((prev) => {
      let at = -1;
      prev.forEach((turn, index) => {
        if (turn.role === "assistant" && turn.text === text) at = index;
      });
      if (at < 0) return prev;
      return prev.map((turn, index) => (index === at ? { ...turn, pictures } : turn));
    });
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

  const dropHeldTurn = useCallback((text) => {
    setTurns((prev) => {
      const at = prev.findLastIndex((turn) => turn.role === "user" && turn.text === text);
      return at < 0 ? prev : prev.filter((_, index) => index !== at);
    });
  }, []);

  // The app's own player on this call. Every voice that reads a turn of the person's reports it here,
  // so what a turn asks of the player — a piece to stand in it, or the player paused, started again,
  // moved on or taken out — is answered by the app itself, whatever voice is on the line.
  const talkRef = useRef(null);
  const stopRef = useRef(null);
  const mediaRef = useRef(null);
  const onMedia = useCallback((said) => mediaRef.current?.read(said) || null, []);
  // Only a talk AI can be told anything mid-call: Cartesia's own settings are left exactly as they
  // are, so there the app's line about its own player stands on the screen instead.
  // Only a talk AI can be told anything mid-call: the app's own OpenAI seat hears the person itself
  // and answers on its own account, and Cartesia's own settings are left exactly as they are — so on
  // those two the app's line about its own player stands on the screen instead.
  const onTell = useCallback(
    (note) => (seatRef.current.kind === "talk" ? !!talkRef.current?.tell?.(note) : false),
    []
  );

  const talk = useTalkVoice({ onTurn, onPictures: patchPictures, onDropTurn: dropHeldTurn, onMedia });
  const cartesia = useCartesiaVoice({
    onTurn,
    onPictures: patchPictures,
    onAnswered,
    onAnswerEnd: dueHandoff,
    onEnded: () => endedRef.current?.(),
    onMedia,
  });
  talkRef.current = talk;

  // the app's own OpenAI seat — AI 1, the first voice of the ring: it hears the person itself and
  // answers on the app's own OpenAI account, so it is opened and hung up exactly like any other voice
  // of the ring
  const openai = useOpenAiVoice({
    onTurn,
    onPictures: patchPictures,
    onAnswered,
    onAnswerEnd: dueHandoff,
    onMedia,
  });

  /**
   * The artist's own set is over — the last of the pieces has played out, or the person has said stop.
   * The talk moves on to the voice that speaks Base44 mode, with the conversation so far carried with
   * it. The change is asked for through the change's own ref, because the change itself is written
   * below the player that asks for it.
   */
  const musicHandoff = useCallback(() => {
    // The voice that speaks Base44 mode already holds the call: the talk is already where the music
    // asks for it to be, so the set ending changes nothing.
    if (seatRef.current.id === BASE44_SEAT_ID) return;
    handoffRef.current?.({ preferId: BASE44_SEAT_ID, music: true });
  }, []);

  // A piece the app chose stands in the app's own player, and the call goes quiet only where the
  // person asked to listen on — and only once the player itself reports the sound has begun. Taking
  // the voice away never touches the player; the artist's own set ending hands the talk on instead.
  const media = useHomeMedia({
    onTell,
    onEndVoice: () => stopRef.current?.(),
    onHandoff: musicHandoff,
  });
  mediaRef.current = media;

  /**
   * The voice one seat stands for opens the call, and says plainly whether it did — and, where the
   * seat is made of more than one account, which of them really answered. The Cartesia seat is three
   * accounts behind one name, so what it reports back is the voice on the line and not the one the
   * call was expected to open on.
   */
  const openSeat = useCallback(
    async (next, checked) => {
      // The session the voice was checked with rides into its call, so the very account that handed
      // one over as it was checked is not asked for a second one a moment later.
      if (next.kind === "cartesia")
        return cartesia.start({
          label: next.label,
          checked: checked?.account ? { [checked.account]: checked.session } : null,
          onStuck: (text) => stuckRef.current?.(text) === true,
        });
      // the app's own OpenAI seat opens on the session it was checked with, and reports its own end
      // like every other voice: a session the service closes leaves the turn where it stood
      if (next.kind === "openai")
        return openai.start({
          label: next.label,
          checked,
          onEnded: () => endedRef.current?.(),
        });
      const why = await talk.start({
        account: next.account,
        label: next.label,
        session: checked?.session,
        onAnswered,
        onAnswerEnd: dueHandoff,
        onEnded: () => endedRef.current?.(),
        onStuck: (text) => stuckRef.current?.(text) === true,
      });
      return why ? { ok: false, why } : { ok: true, why: "" };
    },
    [cartesia, talk, onAnswered, dueHandoff, openai]
  );

  /** The call on air, hung up. */
  const closeSeat = useCallback(
    async (next) => {
      if (next.kind === "cartesia") await cartesia.stop();
      else if (next.kind === "openai") await openai.stop();
      else await talk.stop();
    },
    [cartesia, talk, openai]
  );

  /**
   * The change itself: the voice that takes the next turn is the one that follows this voice in the
   * ring, the call on air is hung up, and the next voice waits for the person's own tap on the phone.
   * The talk so far stays on the screen and goes with the new call, so nothing said before the change
   * is lost from it.
   *
   * `preferId` names the voice the app itself wants the call handed to, where the ring still holds it:
   * when the artist's own set has ended the talk is handed to the voice that speaks Base44 mode, and
   * every other voice of the ring still follows it, so a voice that cannot open is never a dead end.
   * `music` says the change was asked for by the music rather than by a voice having taken its own
   * number of answers: the line on the screen says which, and the voice behind the change is opened
   * here and now rather than left waiting behind a tap.
   */
  const handoff = useCallback(async ({ preferId = "", music = false } = {}) => {
    // a change is already running, or the next voice is already waiting behind the person's tap
    if (turningRef.current || pendingRef.current) return;
    turningRef.current = true;
    const from = seatRef.current;
    // the voices that may take the call next, in the order the ring runs, each of them once — the
    // ones still waiting for their turn, so the call moves on to a voice that has not spoken yet
    const { plan, fresh } = nextPlan(from.id, triedRef.current, usedRef.current);
    // every voice the ring holds has taken its turn: the round is complete, and the ring starts over
    if (!fresh) usedRef.current = [];
    // The voice the app is asked to hand the call to stands at the head of the ring's own order, where
    // the ring still holds it; every other voice of the ring follows in the order it always did.
    const ordered = preferId
      ? [...plan].sort((a, b) => (a.id === preferId ? -1 : b.id === preferId ? 1 : 0))
      : plan;
    // The voice taking the next turn is chosen and waiting from the moment the change begins — and
    // the count starts again from nothing, since the answers so far belonged to the voice standing
    // down. Choosing it here is what keeps a tap that lands while the call is being hung up from
    // opening a second call on top of the voice that is standing down.
    const next = ordered[0];
    answersRef.current = 0;
    // the music the change was asked by rides with it, so a tap that opens the voice on the person's
    // own behalf says the same thing the change itself would have said
    pendingRef.current = { next, plan, from, music };
    setWaiting(true);
    setLabel(next.label);
    setNotice(
      music
        ? musicHandoffNotice(from.label, next.label, true)
        : resumeNotice(from.label, next.label, from.answers)
    );
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
      return;
    }
    // The artist's own set ended under the person's own ears, so the voice that speaks Base44 mode is
    // opened here and now rather than left waiting behind a tap: the music itself asked for the change.
    // Where the phone will not open the microphone without a touch, the change is left waiting exactly
    // as any other is, and the line on the screen says plainly what is left to do.
    if (music) await resumeRef.current?.(true);
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
  const resume = useCallback(async (music = false) => {
    const pending = pendingRef.current;
    if (!pending) return false;
    // the change was asked for by the artist's own set, whether it is opened here and now or by the
    // person's own tap: the line on the screen says the same thing either way
    const byMusic = music || pending.music === true;
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
      // The same check a call's own start makes: every voice that may take the call is asked, all at
      // once, whether it can hand over a session — so a voice that is down is passed over here rather
      // than the person's tap waiting on it. The voice the ring chose opens on the session it was
      // checked with, and there is no second session for it.
      const { ready, refused: down } = await checkVoiceSeats(order);
      const checked = new Map(ready.map((one) => [one.seat.id, one]));
      const tries = [
        ...ready.map((one) => one.seat),
        ...order.filter((seat) => !checked.has(seat.id)),
      ];

      // the voice that could not take the call, and the reason it gave, so the person is told what is
      // left to do about it rather than only that their tap went nowhere
      let refused = down[0] || null;
      for (const next of tries) {
        const opened = await openSeat(next, checked.get(next.id));
        if (!opened.ok) {
          refused = { label: opened.label || next.label, why: opened.why || "" };
          if (!triedRef.current.includes(next.id)) triedRef.current = [...triedRef.current, next.id];
          continue;
        }
        // the seat is written up as the voice that really answered, so the screen names the one on
        // the line — Cartesia AI 1 where the app's own account could not take it, and so on
        const live = liveSeat(next, opened);
        setCurrent(live);
        setNotice(
          byMusic
            ? musicHandoffNotice(pending.from.label, live.label)
            : handoffNotice(pending.from.label, live.label, pending.from.answers)
        );
        return true;
      }

      // None of them could open — an account refused, a microphone another app is holding, a service
      // having a bad moment. Nothing is guessed at: the change is put back exactly where it stood,
      // every voice is offered the turn again, and the person is told plainly which voice refused and
      // that their own tap is what tries again. A call is never left with nothing on the line and
      // taps that do nothing.
      setLabel(pending.from.label);
      setWaiting(true);
      pendingRef.current = {
        next: pending.next,
        plan: pending.plan,
        from: pending.from,
        music: pending.music,
      };
      triedRef.current = [];
      setNotice(refused ? refusedNotice(refused) : "Tap the phone to talk again.");
      return false;
    } finally {
      // the change is over: whoever holds the call now is the one answering
      turningRef.current = false;
    }
  }, [openSeat, setCurrent]);

  // the change's own end is reachable from the change itself, since a set that ends opens the voice
  // behind it without waiting for a tap
  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

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
        if (talk.micActive || cartesia.micActive || openai.micActive) return false;
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

      // Every voice the app is set up with is asked, all at once, whether it can hand over the
      // session a call is opened with — the one question a call itself asks — and the call opens on
      // the first voice in the ring that can. A voice that cannot is passed over, so the person is
      // never left waiting on a voice that is down, and such a voice is not offered the turn again
      // for the rest of this call.
      // Each voice that cannot take it comes back with the reason it gave, so the one thing a person
      // can act on — a key, an agent id, a service having a bad moment — is never swallowed here.
      const { ready, refused } = await checkVoiceSeats(HOME_SEATS);
      const checked = new Map(ready.map((one) => [one.seat.id, one]));
      refused.forEach((seat) => {
        if (!triedRef.current.includes(seat.id)) triedRef.current = [...triedRef.current, seat.id];
      });
      // The voices that answered the check stand in the ring's own order, and the ones that did not
      // follow behind them: a voice that answered and then failed to open still leaves the call
      // somewhere to go rather than nowhere.
      const order = [
        ...ready.map((one) => one.seat),
        ...HOME_SEATS.filter((seat) => !checked.has(seat.id)),
      ];

      for (const next of order) {
        const opened = await openSeat(next, checked.get(next.id));
        if (opened.ok) {
          startingRef.current = false;
          // the seat is written up as the voice that really answered, so a call that opened on one of
          // the Cartesia seat's own backup accounts is named for the account that took it
          const live = liveSeat(next, opened);
          setCurrent(live);
          if (next.id !== HOME_SEATS[0].id) {
            // the voice that could not take the call is named with the reason it gave — Cartesia's own
            // refusal said as Cartesia said it — and the voice really on the line is named with it
            setNotice(refusedNotice(refused[0] || HOME_SEATS[0], live.label));
          }
          return true;
        }
        if (!triedRef.current.includes(next.id)) triedRef.current = [...triedRef.current, next.id];
      }

      // Not one voice could take the call. It is said plainly, and the person's own tap is what tries
      // again: a call is never begun on a voice that has just proved it cannot answer.
      startingRef.current = false;
      callingRef.current = false;
      setCurrent(HOME_SEATS[0]);
      setNotice(
        refused.length
          ? refusedNotice(refused[0])
          : "The call couldn't start — tap the phone and try again."
      );
      return false;
    },
    [cartesia, clearChange, openSeat, resume, setCurrent, talk, openai]
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
  // the app's own player reaches the call's end through here, so a person who asked to listen on has
  // the voice taken away while the piece plays on
  stopRef.current = stop;

  /**
   * A written question is always charged, but it never counts against a voice's turn: what moves the
   * call on is the answers a voice really spoke, so a typed exchange leaves the turn where it was.
   */
  const onWritten = useCallback(() => {
    chargeRef.current?.();
  }, []);

  /**
   * A turn the voice on the line took and never began answering. The voice has had its short
   * opportunity to speak, so the very same turn is handed on to the next voice service: the call on
   * air is hung up, the next voice opens at once — no tap, since the person has already asked their
   * question once — and the words they said are put to it, so the answer that comes is an answer to
   * what they really asked. Returns whether another voice is taking the turn.
   *
   * Only a voice that can be given the words themselves can take a turn that was never answered in
   * speech, so the ring is walked for the first one that can. Where none of them can open, nothing is
   * guessed at: the call is ended here and the person is told plainly rather than left holding a turn
   * nobody is answering.
   */
  const switchOnSilence = useCallback(
    (text) => {
      const said = String(text || "").trim();
      if (!said) return false;
      // a change is already running, or the next voice is already waiting behind the person's tap
      if (!callingRef.current || turningRef.current || pendingRef.current) return false;
      const from = seatRef.current;
      const { plan, fresh } = nextPlan(from.id, triedRef.current, usedRef.current);
      // every voice the ring holds has taken its turn: the round is complete and the ring starts over
      if (!fresh) usedRef.current = [];
      const order = plan.filter((seat) => seat.kind === "talk");
      if (!order.length) return false;

      turningRef.current = true;
      answersRef.current = 0;
      setWaiting(false);
      setNotice(stuckNotice(from.label, order[0].label));

      (async () => {
        try {
          // the voice that went quiet is hung up before the next one opens, so no two voices are ever
          // on the line at once and the microphone is free for the one taking the turn
          try {
            await closeSeat(from);
          } catch (err) {
            // the hang-up was given up on: the call still moves on rather than sitting still
          }
          if (!callingRef.current) return;

          for (const next of order) {
            const opened = await openSeat(next);
            if (!opened.ok) {
              if (!triedRef.current.includes(next.id)) {
                triedRef.current = [...triedRef.current, next.id];
              }
              continue;
            }
            const live = liveSeat(next, opened);
            setCurrent(live);
            setNotice(stuckNotice(from.label, live.label));
            // the very words of the turn ride into the new call — and the turn already stands on the
            // screen as the person's own, so it is put to the voice without being written twice
            await talk.ask(said, onWritten, { replay: true });
            return;
          }

          // none of the other voices could take the call: it is ended here rather than left holding a
          // turn nobody is answering
          callingRef.current = false;
          setWaiting(false);
          setNotice("The call couldn't carry on — tap the phone and ask again.");
        } finally {
          turningRef.current = false;
        }
      })();

      return true;
    },
    [closeSeat, onWritten, openSeat, setCurrent, talk]
  );

  // the turn a voice went quiet on is reported by the voice itself, so it is reachable from there
  useEffect(() => {
    stuckRef.current = switchOnSilence;
  }, [switchOnSilence]);

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
      const live =
        seatRef.current.kind === "openai"
          ? openai
          : seatRef.current.kind === "cartesia"
            ? cartesia
            : talk;
      live.correct?.(said);

      // The app offers to keep what the person put right — their own words in place of what the ears
      // wrote for that turn — and nothing goes into the Word Bank until they answer the offer.
      proposeHeard(said, wasHeard).then((proposal) => {
        if (proposal) setSaveAsk({ ...proposal, text: said, heard: String(wasHeard || "") });
      });
    },
    [cartesia, talk, openai]
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
  const live = seat.kind === "openai" ? openai : seat.kind === "cartesia" ? cartesia : talk;

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
    // the app's own player on this call: the piece the app chose, and what a turn asks of it
    media,
    // a turn the voice holding the call is not sure it heard: either voice asks the person the same
    // way, and their own answer is what settles whether it stands
    heardAsk: live.check,
    acceptHeard: live.acceptHeard,
    againHeard: live.againHeard,
    // what the app would keep from those words, and the person's own answer to the offer
    saveAsk,
    keepSave,
    leaveSave,
  };
}