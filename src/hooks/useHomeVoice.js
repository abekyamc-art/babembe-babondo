import { useCallback, useEffect, useRef, useState } from "react";
import useOpenAiAssistant from "@/hooks/useOpenAiAssistant";
import useCartesiaVoice from "@/hooks/useCartesiaVoice";
import { CARTESIA_AI, KIBEMBE_ASSISTANT } from "@/lib/providerNames";
import { TALK_ANSWERS, handoffNotice } from "@/lib/talkRotation";

/**
 * The home page's call, and who is on it.
 *
 * Two outside voices take their turns the way the app's calls always have: each answers two
 * questions, then that call is hung up and the other one picks the conversation up straight away —
 * the person keeps talking and never starts the next AI themselves. Cartesia AI opens every call,
 * and the app's own assistant takes the second turn and every other one after it.
 */

const ASSISTANT = "assistant";
const CARTESIA = "cartesia";
const NAMES = { [ASSISTANT]: KIBEMBE_ASSISTANT, [CARTESIA]: CARTESIA_AI };

export default function useHomeVoice() {
  const [turns, setTurns] = useState([]);
  const [voice, setVoice] = useState(ASSISTANT);
  const [notice, setNotice] = useState("");

  const voiceRef = useRef(ASSISTANT);
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

  // an answer has been given, so it is charged — and counted against the two this AI gives before
  // the other one takes the call
  const onAnswered = useCallback(() => {
    chargeRef.current?.();
    if (!callingRef.current || turningRef.current) return;
    answersRef.current += 1;
    if (answersRef.current < TALK_ANSWERS) return;
    answersRef.current = 0;
    handoffRef.current?.();
  }, []);

  const assistant = useOpenAiAssistant({ onTurn });
  const cartesia = useCartesiaVoice({ onTurn, onAnswered });

  /** The AI asked to take the call, and why it could not where it could not. */
  const openVoice = useCallback(
    async (which) => {
      if (which === CARTESIA) {
        const why = await cartesia.start();
        return why ? { ok: false, why } : { ok: true, why: "" };
      }
      const ok = await assistant.start({ onAnswered });
      return { ok, why: "" };
    },
    [assistant, cartesia, onAnswered]
  );

  const closeVoice = useCallback(
    async (which) => {
      if (which === CARTESIA) await cartesia.stop();
      else await assistant.stop();
    },
    [assistant, cartesia]
  );

  /**
   * The handover. The call that has had its turn is hung up before the next one opens, so the two
   * are never both listening in the same room; where the next AI cannot open at all the person is
   * never left in silence — the AI that had its turn takes the call straight back, and the reason
   * is said plainly.
   */
  const handoff = useCallback(async () => {
    if (turningRef.current) return;
    turningRef.current = true;

    const from = voiceRef.current;
    const next = from === CARTESIA ? ASSISTANT : CARTESIA;
    // an AI that could not take the call is not asked again in the same call: the one on the line
    // simply keeps it, and the talk never stalls on a voice that cannot open
    if (next === CARTESIA && downRef.current) {
      turningRef.current = false;
      return;
    }

    await closeVoice(from);
    // the person ended the call while it was being handed over
    if (!callingRef.current) {
      turningRef.current = false;
      return;
    }

    voiceRef.current = next;
    setVoice(next);
    setNotice(handoffNotice(NAMES[from], NAMES[next]));

    const opened = await openVoice(next);
    if (opened.ok) {
      turningRef.current = false;
      return;
    }

    if (next === CARTESIA) downRef.current = true;
    voiceRef.current = from;
    setVoice(from);
    // where the next AI gave a reason it could not open, that reason is what is said: it is the one
    // thing that can be acted on
    setNotice(
      opened.why || `${NAMES[next]} couldn't take over — ${NAMES[from]} is carrying on.`
    );
    if (callingRef.current) await openVoice(from);
    turningRef.current = false;
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
      // every call opens on Cartesia AI; the app's own assistant takes its turn once two answers
      // have been given
      voiceRef.current = CARTESIA;
      setVoice(CARTESIA);
      const opened = await openVoice(CARTESIA);
      if (opened.ok) return true;

      // Cartesia AI could not take the call: the assistant opens it instead, and is not asked to
      // hand over to a voice already known to be down during this call
      downRef.current = true;
      voiceRef.current = ASSISTANT;
      setVoice(ASSISTANT);
      setNotice(
        opened.why || `${NAMES[CARTESIA]} couldn't take the call — ${NAMES[ASSISTANT]} is on it.`
      );
      return assistant.start({ onAnswered });
    },
    [assistant, onAnswered, openVoice]
  );

  const stop = useCallback(async () => {
    callingRef.current = false;
    turningRef.current = false;
    answersRef.current = 0;
    setNotice("");
    await closeVoice(voiceRef.current);
  }, [closeVoice]);

  /**
   * A written question is put to the app's own assistant, whichever AI is on the call. Its answer is
   * charged like any other, but it only counts against the assistant's turn while the assistant
   * really holds the call — a line Cartesia AI opened never gave that answer.
   */
  const onWritten = useCallback(() => {
    if (voiceRef.current !== ASSISTANT) {
      chargeRef.current?.();
      return;
    }
    onAnswered();
  }, [onAnswered]);

  const ask = useCallback(
    async (text, charge) => {
      if (charge) chargeRef.current = charge;
      return assistant.ask(text, onWritten);
    },
    [assistant, onWritten]
  );

  const active = voice === CARTESIA ? cartesia : assistant;

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