import { base44 } from "@/api/base44Client";

/**
 * Ends the signed-in account for good: the app's own records are taken out on the server, nothing of
 * the account is left behind on the phone, and the person is signed out to the app's first screen.
 *
 * It stands apart from the surface that asks for it, so the row in the account surface and the row on
 * the profile page end an account the very same way.
 */
export async function deleteMyAccount() {
  const res = await base44.functions.invoke("deleteAccount", {});
  if (res?.data?.error) throw new Error(res.data.error);
  // nothing of the account is left behind on the phone: its stored keys and tokens go with it
  window.localStorage.clear();
  window.sessionStorage.clear();
  // the account is gone, so the app opens again at its first screen
  await base44.auth.logout("/");
}