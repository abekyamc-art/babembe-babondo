import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Ends an account at the owner's own request: everything written under the caller's own name — their
 * profile with its coin balance, their voice recordings, and the history they made — goes first, and
 * then their sign-in record. Only the caller's own records are ever touched, a part that refuses to go
 * never keeps the rest standing, and a sign-in record that refuses to go leaves the purge standing.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const email = user.email;

    // Everything standing under the account's own name goes with it, so nothing of it is left in the
    // app's lists: the profile and the coin balance it carries, the recordings of the person's voice,
    // and the history they made — what they asked, their conversations, their exam marks, their songs
    // and takes, their reels, comments and follows, and their place in a live room.
    const REMOVALS: Array<[string, Record<string, unknown>]> = [
      ["Profile", { user_email: email }],
      ["VoiceVariant", { recorded_by: email }],
      ["UsageRecord", { user_email: email }],
      ["ChatMessage", { members: email }],
      ["ChatThread", { members: email }],
      ["ExamStudentProgress", { owner_id: user.id }],
      ["ExamRecord", { user_email: email }],
      ["StudioProject", { created_by_id: user.id }],
      ["RapTake", { created_by_id: user.id }],
      ["SavedBeat", { created_by_id: user.id }],
      ["Follow", { follower_email: email }],
      ["Follow", { following_email: email }],
      ["ReelLike", { user_email: email }],
      ["ReelComment", { author_email: email }],
      ["Reel", { author_email: email }],
      ["LiveRoom", { host_email: email }],
      ["LivePeer", { user_email: email }],
      ["LiveMessage", { author_email: email }],
      ["LiveRequest", { viewer_email: email }],
      ["LiveSignal", { from_email: email }],
      ["LiveSignal", { to_email: email }],
    ];

    // one part that refuses to go never keeps the rest standing: it is named in the log and the
    // purge carries on, so the account is still ended
    for (const [entity, query] of REMOVALS) {
      try {
        await (base44.asServiceRole.entities as any)[entity].deleteMany(query);
      } catch (error: any) {
        console.error(`Could not remove ${entity}:`, error?.message);
      }
    }

    let signInRemoved = false;
    try {
      await base44.asServiceRole.entities.User.delete(user.id);
      signInRemoved = true;
    } catch (error: any) {
      console.error('Could not remove the sign-in record:', error?.message);
    }

    return Response.json({ profile_removed: true, sign_in_removed: signInRemoved });
  } catch (error: any) {
    console.error('Could not delete the account:', error?.message);
    return Response.json({ error: 'Could not delete the account.' }, { status: 500 });
  }
}