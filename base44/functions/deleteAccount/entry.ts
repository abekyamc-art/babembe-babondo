import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Ends an account at the owner's own request: the caller's profile goes first, and
 * then their sign-in record. Only the caller's own records are ever touched, and a
 * sign-in record that refuses to go leaves the profile step standing.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 });
    }

    await base44.asServiceRole.entities.Profile.deleteMany({ user_email: user.email });

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