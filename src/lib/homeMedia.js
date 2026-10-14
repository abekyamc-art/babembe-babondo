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
// media, or for the player to be moved — and the words that name music, an artist, a channel or an
// album themselves, because a turn can ask for a piece without any word for playing it: "msanii
// magdelena athuman", "nyimbo za msanii", "artist magdalena". A turn with none of them is read no
// further, and a turn that names an artist but asks nothing to be played is still answered in words:
// the app's own selection reads each one and hands back nothing to play where nothing was asked for.
const MEDIA_ASK =
  /\b(play|playing|piga|weka|imba|sing|nyimbo|wimbo|muziki|mziki|song|songs|music|video|videos|kanda|album|albamu|msanii|wasanii|msani|mwimbaji|mwanamuziki|mchezaji|mwandishi|sanaa|artist|artists|singer|singers|musician|musicians|band|kwaya|channel|youtube|pause|pausa|simama|nyamaza|resume|endelea|endeleza|continue|next|ingine|nyingine|another|stop|acha|funga|zima|basi|sikiliza|listen|niache|nisikilize)\b/i;

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
 * A short naming of the pieces for the line on the screen, where the app holds some: three at most,
 * each cut to a few words. The line stands in the talk's own band, so it is kept to what is read at
 * a glance — the whole of a title rides in the voice's own words, never on this line.
 */
function shortNames(names) {
  const list = (Array.isArray(names) ? names : [])
    .filter(Boolean)
    .slice(0, 2)
    .map((one) => {
      const said = String(one).trim();
      return said.length > 18 ? `${said.slice(0, 18).trim()}…` : said;
    });
  return list.join(", ");
}

/**
 * The artist's own pieces the app holds out to the person to choose from, each with the name it goes
 * by and the address it stands at. They are what is pressed on the screen — a tap plays that piece
 * here in the app's own player — and they are only ever pieces the app really holds of that artist.
 */
function piecesOf(data) {
  return (Array.isArray(data?.pieces) ? data.pieces : [])
    .filter((one) => one?.url)
    .map((one) => ({ name: String(one?.name || ''), url: String(one?.url) }));
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
  // how many of the artist's own pieces wait behind the one standing
  const rest = Number(data?.count) || 0;
  // the piece standing belongs to the artist's own set: the player starts it by itself and moves on
  const auto = data?.auto === true;

  switch (step) {
    case "set":
      return {
        line: `Nimekuweka — ${name} is starting now${
          rest ? `, with ${rest} more of the artist's own behind it` : ""
        }.`,
        spoken:
          `The app has put the artist's own pieces in its own player and is starting "${name}" now: it plays here, with its sound.` +
          (rest
            ? ` ${rest} more of the artist's own pieces wait behind it, and the player moves on to each of them by itself when one ends.`
            : ` It is the only piece of the artist's the app holds.`) +
          ` Say only what the app has done, in one short line, and never that a piece is playing before` +
          ` the app's own player reports it — the call itself ends the moment the sound really begins.`,
      };
    case "quiet":
      return {
        line: `Nimekuweka — ${name} is starting now. Listen on — the voice goes quiet once it plays.`,
        spoken:
          `The person asked to listen on without more talk, and the app's own player is starting "${name}" now. ` +
          `Say one short line that it is playing, then be quiet — this call goes quiet once the sound has really begun.`,
      };
    case "ambiguous":
      return {
        offer: piecesOf(data),
        line: `Which one — ${names}?`,
        spoken:
          `More than one of the artist's own pieces answers that title: ${names}. The app chose none of them. ` +
          `Ask the person which one they mean, in one short question, and choose nothing yourself.`,
      };
    case "none": {
      // The one piece the app named to the person, where it named one: it stands first among what the
      // app holds of the artist, and a plain yes plays it. The app's own line says what it holds as well
      // as what it did not choose, so a title of its own that answered nothing is still a turn the person
      // can carry on from — by saying yes to the piece the app named, by naming another of the pieces it
      // holds, or by giving its place in this line.
      const first = String(data?.name || "").trim();
      return {
        offer: piecesOf(data),
        line: names
          ? first
            ? `Not in the artist's own list — is it ${shortNames([first])}? Say yes, or which one you want.`
            : `Not in the artist's own list — the app holds ${shortNames(data?.names)}. Say which one.`
          : channel
            ? `That one is not in the artist's own list — their channel is ${channel}.`
            : "That one is not among the artist's own pieces, so nothing was put in the player.",
        spoken:
          `That title is not among the artist's own pieces as the app holds them${names ? ` — the app holds ${names}` : ""}, so nothing was chosen. ` +
          (first
            ? `Ask the person whether "${first}" is the one they mean, in one short question, naming it exactly as it stands — ` +
              `and say that the rest of what the app holds is there as well: their yes plays "${first}", and naming any of the others plays that one. `
            : `Say so plainly and ask which of those pieces they want, so the person can answer with one of them. `) +
          (channel ? `The artist's own channel is ${channel}. ` : "") +
          `Never invent a title or a link.`,
      };
    }
    case "which":
      // The app put more than one of the artist's pieces to the person and cannot tell which is meant:
      // nothing was chosen, and the question is asked again in the shape it can be answered in — by the
      // piece's own name, or by its place in the question.
      return {
        offer: piecesOf(data),
        line: `Which one — ${names}? Say its name, or its number.`,
        spoken:
          `The app has put ${names} to the person and cannot tell which one they mean: none of them was chosen and ` +
          `nothing is playing. Ask which one they mean, in one short question, and say plainly that they may answer with ` +
          `the piece's own name or with its number in the question — the app plays the one they answer with. Choose ` +
          `nothing yourself.`,
      };
    case "go":
      return {
        line: `Nimeanza — ${name} is starting now.`,
        spoken:
          `The app has started its own player on "${name}", the piece standing in it. Say only what the app has done, in ` +
          `one short line, and never that a piece is playing before the app's own player reports it — the call itself ` +
          `ends the moment the sound really begins.`,
      };
    case "looking":
      // The app has begun reading the turn for its own player: the screen says so the moment the ask is
      // made, so a request for a piece is never met with a screen that has not changed at all. Nothing
      // has been done yet, so no voice is told anything.
      return {
        line: "Natafuta — looking for that piece in the artist's own list…",
        spoken: "",
      };
    case "idle":
      // Nothing was put in the player and nothing was put to the person: the line above comes off the
      // screen and the turn is left to the voice, or to the assistant, exactly as it stands.
      return { line: "", spoken: "" };
    case "last":
      return {
        line: "That was the last of the artist's pieces in the player.",
        spoken:
          "There is no next piece: the app's own list of the artist's pieces ends where the player stands. Say so plainly.",
      };
    case "next":
      return auto
        ? {
            line: `Inaendelea — ${name} is playing.`,
            spoken: `The app's own player has moved on to the artist's own next piece, "${name}", and it is playing now.`,
          }
        : {
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
        line: "Nothing is playing now — the player is put away.",
        spoken: "The app has stopped its own player and put the piece away: nothing is playing now.",
      };
    case "setDone":
      return {
        line: "That was the last of the artist's own — nothing is playing now.",
        spoken:
          "The artist's own set has ended and the app has put its player away: nothing is playing now.",
      };
    case "hangup":
      return {
        line: `The call is over — ${name} plays on here.`,
        // no voice is left on the line to be told anything: the app's own words stand on the screen
        spoken: "",
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