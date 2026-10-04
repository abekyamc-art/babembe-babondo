/**
 * Cutting a song into its parts through the app's own ElevenLabs account. The provider
 * hands back an archive holding the stems, and the parts are told apart by name, so a
 * change in the archive's order can never hand the voice back as the beat.
 */

import { unzipSync } from "npm:fflate@0.8.2";

const STEMS_URL = "https://api.elevenlabs.io/v1/music/separate-stems";

const VOICE_NAMES = ["vocal", "voice", "acapella", "a_cappella", "a-cappella"];
const BAND_NAMES = ["instrumental", "accompani", "karaoke", "no_vocal", "music", "other"];

export type Stem = { type: string; bytes: Uint8Array };

function typeOf(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  return "audio/mpeg";
}

function named(files: any[], words: string[]) {
  return files.find((file: any) => words.some((word) => file.name.toLowerCase().includes(word)));
}

/** The voice on its own, and everything else the song carries. */
export async function separateStems(
  apiKey: string,
  bytes: Uint8Array
): Promise<{ voice: Stem; band: Stem } | null> {
  try {
    const form = new FormData();
    form.append("file", new File([bytes], "song.mp3", { type: "audio/mpeg" }));

    // the two-stem variation is the one that hands back the voice and the band on their own
    const res = await fetch(STEMS_URL + "?stem_variation_id=two_stems_v1", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
    if (!res.ok) {
      console.error("Stem separation refused:", res.status, (await res.text()).slice(0, 300));
      return null;
    }

    const archive = unzipSync(new Uint8Array(await res.arrayBuffer()));
    const files = Object.keys(archive)
      .filter((name) => !name.endsWith("/") && archive[name]?.length)
      .map((name) => ({ name, bytes: archive[name] }));

    let voice = named(files, VOICE_NAMES);
    let band = named(files, BAND_NAMES);

    // an archive of exactly two parts still tells them apart when nothing is named
    if (files.length === 2 && !voice) {
      const [a, b] = files;
      voice = a.bytes.length <= b.bytes.length ? a : b;
    }
    if (!band) band = files.find((file: any) => file !== voice);
    if (!voice || !band) return null;

    return {
      voice: { type: typeOf(voice.name), bytes: voice.bytes },
      band: { type: typeOf(band.name), bytes: band.bytes },
    };
  } catch (error: any) {
    console.error("Stem separation failed:", error?.message);
    return null;
  }
}