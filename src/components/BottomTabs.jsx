import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clapperboard, Coins, Home as HomeIcon, MessageCircle } from "lucide-react";
import { TAB_ROOTS, tabOf } from "@/lib/tabs";

const TABS = [
  { key: "home", label: "Home", icon: HomeIcon },
  { key: "reels", label: "Reels", icon: Clapperboard },
  { key: "messages", label: "Messages", icon: MessageCircle },
  { key: "coins", label: "Coins", icon: Coins },
];

/** The four places of the app, in one bar that never leaves the screen. */
export default function BottomTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // a screen opened from a tab — a profile, a chat — still belongs to that tab
  const [carried, setCarried] = useState("home");

  const here = tabOf(pathname);
  useEffect(() => {
    if (here) setCarried(here);
  }, [here]);

  const current = here || carried;

  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.key === current;
        const Icon = tab.icon;
        const root = TAB_ROOTS[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            className={`tab-item${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => navigate(root, { replace: pathname === root })}
          >
            <Icon aria-hidden="true" />
            <span>{tab.label}</span>
            <span className={`tab-dot${active ? "" : " opacity-0"}`} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}