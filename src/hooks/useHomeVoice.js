import { useCallback, useEffect, useRef, useState } from "react";
import useSadikiVoice from "@/hooks/useSadikiVoice";
import useCartesiaVoice from "@/hooks/useCartesiaVoice";
import { CARTESIA_AI, SADIKI_AI } from "@/lib/providerNames";
import { CARTESIA_ANSWERS, TALK_ANSWERS, handoffNotice } from "@/lib/talkRotation";

/**
 * The home page's call, and who is on it.
 *
 * Two voices take their turns the way the app's calls always have: each answers its own number of
 * questions, then that call is hung up and the other one picks the conversation up straight away —
 * the person keeps talking and never starts the next AI themselves. Cartesia AI opens every call,
 * answers seven questions and hands over; Sadiki AI answers two and hands back, and the two swap
 * places for as long as the call runs.
 *
 * The app's own Kibembe assistant no longer answers on this screen: it works on the Kibembe
 * assistance screen now, where Sadiki reads its answers with it.
 */

const SADIKI = "sadiki";
const CARTESIA = "cartesia";
const NAMES = { [SADIKI]: SADIKI_AI, [CARTESIA]: CARTESIA_AI };

// How long each voice holds the call before it is hung up and the other one takes over.
const TURN_ANSWERS = { [CARTESIA]: CARTESIA_ANSWERS, [SADIKI]: TALK_ANSWERS };

const turnAnswers = (voice) => TURN_ANSWERS[voice] || TALK_ANSWERS;

export default function useHomeVoice() {
  const [turns, setTurns] = useState([]);
  const [voice, setVoice] = useState(SADIKI);
  const [notice, setNotice] = useState("");

  const voiceRef = useRef(SADIKI);
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

  // an answer has been given, so it is charged — and counted against the number this voice answers
  // before the other one takes the call: Cartesia AI seven, Sadiki AI two
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    if (!callingRef.current || turningRef.current) return;
    answersRef.current += 1;
    if (answersRef.current < turnAnswers(voiceRef.current)) return;
    answersRef.current = 0;
    handoffRef.current?.();
  }, []);

  const sadiki = useSadikiVoice({ onTurn });
  const cartesia = useCartesiaVoice({ onTurn, onAnswered });

  /** The AI asked to take the call, and why it could not where it could not. */
  const openVoice = useCallback(
    async (which) => {
      // each AI opens on its own account and says plainly when it could not, so whoever cannot take
      // the call is named rather than left to be guessed at
      const why = which === CARTESIA ? await cartesia.start() : await sadiki.start({ onAnswered });
      return why ? { ok: false, why } : { ok: true, why: "" };
    },
    [cartesia, sadiki, onAnswered]
  );

  const closeVoice = useCallback(
    async (which) => {
      if (which === CARTESIA) await cartesia.stop();
      else await sadiki.stop();
    },
    [cartesia, sadiki]
  );

  /**
   * The handover. The call that has had its turn is hung up before the next one opens, so the two
   * are never both listening in the same room; where the next AI cannot open at all the person is
   * never left in silence — the AI that had its turn takes the call straight back, and the reason
   * is said plainly.
   */
  const handoff = useCallback(async (saying = "") => {
    if (turningRef.current) return;
    turningRef.current = true;
    try {
      const from = voiceRef.current;
      const next = from === CARTESIA ? SADIKI : CARTESIA;
      // an AI that could not take the call is not asked again in the same call: the one on the line
      // simply keeps it, and the talk never stalls on a voice that cannot open
      if (next === CARTESIA && downRef.current) return;

      await closeVoice(from);
      // the person ended the call while it was being handed over
      if (!callingRef.current) return;

      voiceRef.current = next;
      setVoice(next);
      // the voice taking the call opens its own turn: the answers before the handover were the other
      // one's, and every one of them is already spent
      answersRef.current = 0;
      setNotice(saying || handoffNotice(NAMES[from], NAMES[next], turnAnswers(from)));

      const opened = await openVoice(next);
      if (opened.ok) return;

      if (next === CARTESIA) downRef.current = true;
      voiceRef.current = from;
      setVoice(from);
      // where the next AI gave a reason it could not open, that reason is what is said: it is the one
      // thing that can be acted on
      setNotice(
        opened.why || `${NAMES[next]} couldn't take over — ${NAMES[from]} is carrying on.`
      );
      if (callingRef.current) await openVoice(from);
    } finally {
      // a swap that could not finish never leaves the rotation wedged: the answer after it hands
      // over like any other
      turningRef.current = false;
    }
  }, [closeVoice, openVoice]);

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
      downRef.current = false;
      setNotice("");
      // every call opens on Cartesia AI; Sadiki AI takes its turn once Cartesia has given its
      // seven answers
      voiceRef.current = CARTESIA;
      setVoice(CARTESIA);
      const opened = await openVoice(CARTESIA);
      if (opened.ok) return true;

      // Cartesia AI could not take the call: Sadiki AI opens it instead, and is not asked to hand
      // over to a voice already known to be down during this call
      downRef.current = true;
      voiceRef.current = SADIKI;
      setVoice(SADIKI);
      const backup = await openVoice(SADIKI);
      setNotice(
        backup.why ||
          opened.why ||
          `${NAMES[CARTESIA]} couldn't take the call — ${NAMES[SADIKI]} is on it.`
      );
      return backup.ok;
    },
    [onAnswered, openVoice]
  );

  const stop = useCallback(async () => {
    callingRef.current = false;
    turningRef.current = false;
    answersRef.current = 0;
    setNotice("");
    await closeVoice(voiceRef.current);
  }, [closeVoice]);

  /**
   * A written question is put to Sadiki AI, whichever AI is on the call. Its answer is charged like
   * any other, but it only counts against Sadiki's turn while Sadiki really holds the call — a line
   * Cartesia AI opened never gave that answer.
   */
  const onWritten = useCallback(() => {
    if (voiceRef.current !== SADIKI) {
      chargeRef.current?.();
      return;
    }
    onAnswered();
  }, [onAnswered]);

  const ask = useCallback(
    async (text, charge) => {
      if (charge) chargeRef.current = charge;
      return sadiki.ask(text, onWritten);
    },
    [sadiki, onWritten]
  );

  const active = voice === CARTESIA ? cartesia : sadiki;

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
    voiceLabel: NAMES[voice],
    start,
    stop,
    ask,
  };
}