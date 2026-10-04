import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { separateStems } from "../../shared/stems.ts";

const UNAVAILABLE =
  "Sauti haikuweza kutenganishwa kwa sasa. Jaribu tena baada ya sekunde chache.";
const MAX_BYTES = 40 * 1024 * 1024;

/**
 * The beat alone out of a song the person sent: the song is read back through its own
 * short-lived link, cut into its parts by the provider, and the band — the beat, with
 * the drums and bass still in it — is kept privately for the studio to lay a take on.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });

    const apiKey = secrets.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      console.error("The ElevenLabs key is missing.");
      return Response.json({ error: UNAVAILABLE }, { status: 500 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const url = typeof payload?.url === "string" ? payload.url : "";
    if (!/^https:\/\//.test(url)) {
      return Response.json({ error: "Faili la wimbo halipo." }, { status: 400 });
    }

    const song = await fetch(url);
    if (!song.ok) return Response.json({ error: UNAVAILABLE }, { status: 502 });
    const bytes = new Uint8Array(await song.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) {
      return Response.json({ error: "Wimbo huu ni mkubwa mno kutenganishwa." }, { status: 400 });
    }

    const stems = await separateStems(apiKey, bytes);
    if (!stems) return Response.json({ error: UNAVAILABLE }, { status: 502 });

    const file = new File([stems.band.bytes], "beat.mp3", { type: stems.band.type });
    const uploaded: any = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    if (!uploaded?.file_uri) {
      console.error("The cleaned beat could not be stored.");
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    return Response.json({ file_uri: uploaded.file_uri });
  } catch (error: any) {
    console.error("Beat separation failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}