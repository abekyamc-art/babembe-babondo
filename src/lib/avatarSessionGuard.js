/** The SDK launches cleanup without awaiting it, even after a failed start.
 * Observe that promise on this session only; never alter global network responses.
 */
export function guardAvatarHousekeeping(session) {
  const cleanup = session.cleanup.bind(session);
  session.cleanup = (...args) => cleanup(...args).catch((error) => {
    if (/session not found/i.test(error?.message || "")) return;
    console.warn("LiveAvatar cleanup could not finish:", error?.message || error);
  });
}