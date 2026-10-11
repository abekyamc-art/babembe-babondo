import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { tabOf } from "@/lib/tabs";

/**
 * Where each tab was left.
 *
 * The four tabs each remember the last screen reached inside them — a chat still standing open, a
 * profile, a market — together with its search, so moving to another tab and coming back returns a
 * person to where they were instead of to the tab's first screen. Only screens that belong to a tab
 * are written down: a screen reached from a tab keeps that tab lit, but it is not a tab's own place.
 *
 * The memory stands in one place for the whole app: the bar reads it when a tab is tapped, and clears
 * a tab's place when that tab is tapped again, so a second tap puts the tab back to its first screen.
 */
const TabMemory = createContext({ lastOf: () => "", forget: () => {} });

export function TabMemoryProvider({ children }) {
  const { pathname, search } = useLocation();
  const [last, setLast] = useState({});

  // every tabbed screen is written into its own tab's memory as it is reached
  useEffect(() => {
    const key = tabOf(pathname);
    if (!key) return;
    const place = pathname + search;
    setLast((held) => (held[key] === place ? held : { ...held, [key]: place }));
  }, [pathname, search]);

  const lastOf = useCallback((key) => last[key] || "", [last]);
  const forget = useCallback((key) => setLast((held) => ({ ...held, [key]: "" })), []);

  const value = useMemo(() => ({ lastOf, forget }), [lastOf, forget]);
  return <TabMemory.Provider value={value}>{children}</TabMemory.Provider>;
}

export function useTabMemory() {
  return useContext(TabMemory);
}