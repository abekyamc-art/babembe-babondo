/**
 * The app's own drawing, paid out of the app's own credits.
 *
 * A picture is drawn here when the owner's own accounts and their Replicate account have both been unable
 * to draw it — an allowance that has run out, or an account with no credit left. It is the last source the
 * app has, and the only one the app itself pays for, so it is reached only after every source of the
 * owner's own has refused: nothing is ever drawn on the app's credits while one of those can still draw.
 *
 * The two kinds of drawing the episodes ask for are asked for here exactly as they are on the other
 * sources: a picture made from words alone, and a picture made again from a picture it is handed, with
 * only what was asked for changed — the shape and the style are asked for in the words themselves, so a
 * picture drawn here stands in the same wide cartoon look as every other picture of the game.
 */
export async function creditImage({ base44, prompt, reference_url = null }: any = {}) {
  if (!prompt) throw new Error('No picture was asked for.');

  const drawn: any = await base44.asServiceRole.integrations.Core.GenerateImage({
    prompt,
    ...(reference_url ? { existing_image_urls: [reference_url] } : {}),
  });

  const url = String(drawn?.url || '').trim();
  if (!url) throw new Error("The app's own credits returned no picture.");
  return url;
}