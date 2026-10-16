import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { otherMember, previewOf } from "@/lib/chat";
import { blockedEmails } from "@/lib/moderation";
import PullToRefresh from "@/components/PullToRefresh";

export default function Messages() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [checked, setChecked] = useState(false);
  const [threads, setThreads] = useState([]);
  const [people, setPeople] = useState({});
  const [loading, setLoading] = useState(true);
  const lastLoad = useRef(0);

  useEffect(() => {
    base44.auth
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setChecked(true));
  }, []);

  // the inbox's own loader: the first load, a live line and a pull all run it
  const load = useCallback(async () => {
    if (!me) return;
    lastLoad.current = Date.now();
    const page = await base44.entities.ChatThread.filter(
      { members: me.email },
      { sort: "-last_at", limit: 50 }
    );
    // whoever this person has blocked keeps out of the inbox as well as the feed
    const kept = await blockedEmails(me.email);
    const rows = (page?.items || []).filter(
      (thread) => !kept.includes(otherMember(thread, me.email))
    );
    const others = [...new Set(rows.map((thread) => otherMember(thread, me.email)))];
    const found = others.length
      ? await base44.entities.Profile.filter({ user_email: { $in: others } }, { limit: 50 })
      : { items: [] };
    setThreads(rows);
    setPeople(
      Object.fromEntries((found?.items || []).map((person) => [person.user_email, person]))
    );
  }, [me]);

  useEffect(() => {
    if (!me) return undefined;
    let alive = true;
    load().finally(() => {
      if (alive) setLoading(false);
    });
    const unsubscribe = base44.entities.ChatThread.subscribe(() => {
      if (Date.now() - lastLoad.current < 3000) return;
      load();
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [me, load]);

  const ready = checked && !loading;

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-[16px] tracking-tight">Messages</h1>
      </header>

      <PullToRefresh onRefresh={load} className="min-h-0 flex-1 overflow-y-auto overscroll-none">
        {threads.length ? (
          <ul className="divide-y divide-border px-2">
            {threads.map((thread) => {
              const other = otherMember(thread, me.email);
              const person = people[other];
              const username = person?.username || other.split("@")[0];
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${thread.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-secondary/60"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-[15px] font-semibold uppercase text-muted-foreground">
                      {person?.avatar_url ? (
                        <Image
                          src={person.avatar_url}
                          alt=""
                          focalPointX={person.avatar_crop_x}
                          focalPointY={person.avatar_crop_y}
                          className="h-12 w-12"
                        />
                      ) : (
                        username.slice(0, 1)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">@{username}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {previewOf(thread)}
                      </span>
                    </span>
                    {thread.last_at ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(thread.last_at), { addSuffix: true })}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
            <MessageCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">
              No conversations yet. Open someone's profile and tap the message button.
            </p>
            <button
              type="button"
              onClick={() => navigate("/reels")}
              className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background"
            >
              Find someone
            </button>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}