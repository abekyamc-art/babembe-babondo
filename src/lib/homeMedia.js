import { base44 } from "@/api/base44Client";

/**
 * What a turn asks of the app's own player.
 *
 * The voices on a home call hear and answer on their own accounts and can call no tool at all, so
 * the app itself reads the turn: it asks its own selection (mediaSelection) what the turn asks for,
 * and that answer — a piece the artist has really published, or the player to be paused, started
 * again, moved on or taken out — is what the app acts on. Nothing is ever chosen by the voice.
 *
 * The lines below are the app's own words about its own player, and they are two: what stands on the
 * screen, and what the voice is told when it can be told anything at all. They only ever say what the
 * app itself has done. Whether a piece is really playing is never said here — the player on the phone
 * reports that, and the app speaks it only then.
 */

// The cheap reading of a turn, so ordinary talk is never sent anywhere: the words that may ask for
// media, or for the player to be moved. A turn with none of them is read no further.
const MEDIA_ASK =
  /\b(play|playing|piga|weka|imba|nyimbo|wimbo|muziki|song|songs|music|video|videos|kanda|album|pause|pausa|simama|nyamaza|resume|endelea|endeleza|continue|next|ingine|nyingine|another|stop|acha|funga|zima|basi|sikiliza|listen|niache|nisikilize)\b/i;

/** Whether a turn may be asking the app's own player for something. */
export function looksLikeMediaTurn(text) {
  const said = String(text || "").trim();
  return said.length > 2 && MEDIA_ASK.test(said);
}

/**
 * What the app's own selection makes of one turn: the piece to stand in its player, or which way the
 * player is to be moved. A turn that asks for nothing of the player comes back as nothing at all.
 */
export async function readMediaTurn(text) {
  const said = String(text || "").trim();
  if (!said) return null;
  try {
    const res = await base44.functions.invoke("mediaSelection", { request: said });
    const data = res?.data || null;
    if (!data?.ok) return null;
    const intent = String(data.intent || "none");
    if (intent === "none") return null;
    return { ...data, intent };
  } catch (err) {
    // a reading that cannot be made never holds a call up: the turn is answered by the voice itself
    return null;
  }
}

/** A short way of naming two or three pieces in one line. */
function joinNames(names) {
  const list = (Array.isArray(names) ? names : []).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`;
}

/**
 * The app's own words about its own player: what stands on the screen, and the same said to the voice
 * where a voice can be told. The voice is only ever told what the app has really done, and it is told
 * plainly that a piece standing in the player has not started.
 */
export function mediaLines(step, data = {}) {
  const name = String(data?.name || "").trim();
  const channel = String(data?.channel || "").trim();
  const names = joinNames(data?.names);

  switch (step) {
    case "standing":
      return {
        line: `Nimekuweka — ${name} stands in the player. Press play.`,
        spoken:
          `The app's own player now stands "${name}". It has NOT started: the person presses play in the player themselves. ` +
          `Say only that you have put it in the player and that it is ready — never that it is playing.`,
      };
    case "quiet":
      return {
        line: `Nimekuweka — ${name}. Press play: once it really starts, the voice goes quiet and the song plays on.`,
        spoken:
          `The person asked to listen on without more talk, and the app's own player now stands "${name}", not started. ` +
          `Say one short line that it is in the player and that they press play, then be quiet — this call goes quiet once it has really started.`,
      };
    case "ambiguous":
      return {
        line: `Which one — ${names}?`,
        spoken:
          `More than one of the artist's own pieces answers that title: ${names}. The app chose none of them. ` +
          `Ask the person which one they mean, in one short question, and choose nothing yourself.`,
      };
    case "none":
      return {
        line: channel
          ? `That one is not in the artist's own list — their channel is ${channel}.`
          : "That one is not among the artist's own pieces, so nothing was put in the player.",
        spoken:
          `That title is not among the artist's own pieces as the app holds them${names ? ` — the app holds ${names}` : ""}, so nothing was chosen. ` +
          `Say so plainly${channel ? `, and give the artist's own channel: ${channel}` : ""}. Never invent a title or a link.`,
      };
    case "last":
      return {
        line: "That was the last of the artist's pieces in the player.",
        spoken:
          "There is no next piece: the app's own list of the artist's pieces ends where the player stands. Say so plainly.",
      };
    case "next":
      return {
        line: `${name} stands in the player. Press play.`,
        spoken: `The app has moved its own player on to "${name}", which has not started — the person presses play.`,
      };
    case "pause":
      return {
        line: "Paused.",
        spoken: "The app has paused its own player.",
      };
    case "resume":
      return {
        line: "Playing again.",
        spoken: "The app has started its own player again.",
      };
    case "stop":
      return {
        line: "The piece is out of the player — press play and it stands again.",
        spoken: "The app has taken the piece out of its own player: nothing is playing now.",
      };
    case "started":
      return {
        line: "Playing.",
        spoken: `The app's own player has really started playing "${name}" now.`,
      };
    case "quietDone":
      return {
        line: "The voice is quiet — the piece plays on.",
        spoken: "",
      };
    case "unready":
    default:
      return {
        line: "Nothing stands in the player yet — ask for a piece first.",
        spoken:
          "Nothing stands in the app's own player, so there was nothing to pause, start or move. Say so plainly and ask which piece they want.",
      };
  }
}