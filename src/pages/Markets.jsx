import React, { useEffect, useState } from "react";
import { Coins, Loader2, MessageCircle, Rocket, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  BOOST_COST,
  COIN_PACKAGES,
  GIFTS,
  MESSAGE_COST,
  WELCOME_COINS,
  balanceOf,
} from "@/lib/coins";
import { ensureProfile } from "@/lib/social";

export default function Markets() {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await base44.auth.me();
      const mine = await ensureProfile(user);
      if (!alive) return;
      setProfile(mine);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overscroll-none bg-background px-5 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <h1 className="font-display text-[18px] tracking-tight">Coins</h1>
      </header>

      <div className="mt-5 flex items-center justify-between rounded-3xl bg-foreground px-5 py-4 text-background">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-background/60">
            Your balance
          </p>
          <p className="mt-1 font-display text-3xl">{balanceOf(profile)}</p>
        </div>
        <Coins className="h-8 w-8 text-accent" />
      </div>

      <h2 className="mt-7 text-[11px] font-bold uppercase tracking-[1.6px] text-muted-foreground">
        Coin packs
      </h2>
      <div className="mt-3 space-y-2.5">
        {COIN_PACKAGES.map((pack) => (
          <div
            key={pack.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <div>
              <p className="text-[15px] font-semibold">{pack.coins} coins</p>
              <p className="text-[13px] text-muted-foreground">{pack.price}</p>
            </div>
            <button
              type="button"
              disabled
              className="shrink-0 rounded-full bg-secondary px-4 py-2 text-[12px] font-semibold text-muted-foreground"
            >
              Coming with store billing
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        Purchases will be completed by the App Store and Google Play as soon as that billing is
        supported here — no card or other payment provider is used in the app.
      </p>

      <h2 className="mt-7 text-[11px] font-bold uppercase tracking-[1.6px] text-muted-foreground">
        What coins do
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
        <li className="flex items-center gap-3 px-4 py-3.5">
          <Rocket className="h-4 w-4 shrink-0 text-accent" />
          <span className="flex-1 text-[14px]">Boost a reel to the top of the feed</span>
          <span className="text-[13px] font-semibold text-muted-foreground">{BOOST_COST}</span>
        </li>
        <li className="flex items-center gap-3 px-4 py-3.5">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" />
          <span className="flex-1 text-[14px]">
            Send a gift to a host while they're live — {GIFTS[0].name} {GIFTS[0].coins}, {GIFTS[1].name}{" "}
            {GIFTS[1].coins}
          </span>
        </li>
        <li className="flex items-center gap-3 px-4 py-3.5">
          <MessageCircle className="h-4 w-4 shrink-0 text-accent" />
          <span className="flex-1 text-[14px]">Each answer past your free daily questions</span>
          <span className="text-[13px] font-semibold text-muted-foreground">{MESSAGE_COST}</span>
        </li>
      </ul>

      <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
        Every account starts with {WELCOME_COINS} welcome coins. Your free daily questions
        are used first — after those, each answer takes one coin.
      </p>
    </div>
  );
}