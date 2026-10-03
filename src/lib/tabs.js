/** The four tabs and their first screens. */
export const TAB_ROOTS = {
  home: "/",
  reels: "/reels",
  messages: "/messages",
  coins: "/markets",
};

/**
 * Which tab a screen belongs to: its own tab for the four tab roots, and nothing
 * for a screen that sits inside one of them — a profile belongs to whichever tab it
 * was opened from, so the bar keeps that tab lit.
 */
export function tabOf(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/reels" || pathname.startsWith("/reels/")) return "reels";
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return "messages";
  if (pathname === "/markets" || pathname.startsWith("/markets/")) return "coins";
  return "";
}

const TABBED = ["/reels", "/markets", "/messages", "/u"];

/** Whether the bar belongs on this screen: the tabs and the profiles opened from them. */
export function isTabPath(pathname) {
  if (pathname === "/") return true;
  return TABBED.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}