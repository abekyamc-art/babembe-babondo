import React, { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

export default function PeoplePanel({
  open,
  onOpenChange,
  people,
  iFollow,
  followsMe,
  me,
  onFollow,
  onSearch,
  onOpenPerson,
}) {
  const [term, setTerm] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        await onSearch(term);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(id);
      setSearching(false);
    };
  }, [term, open, onSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal tracking-tight">
            People
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by username…"
            aria-label="Search people"
            className="h-10 pl-9 text-[14px]"
          />
        </div>

        <div className="max-h-72 overflow-y-auto overscroll-contain">
          {searching && !people.length ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : people.length ? (
            <ul className="divide-y divide-border">
              {people.map((person) => {
                const isMe = person.user_email === me?.email;
                const following = !!iFollow[person.user_email];
                const followsBack = (followsMe || []).includes(person.user_email);
                const friends = following && followsBack;
                return (
                  <li key={person.id} className="flex items-center gap-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenPerson?.(person)}
                      aria-label={`Open @${person.username || "friend"}'s profile`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-[13px] font-semibold uppercase text-muted-foreground">
                        {person.avatar_url ? (
                          <Image
                            src={person.avatar_url}
                            alt=""
                            focalPointX={person.avatar_crop_x}
                            focalPointY={person.avatar_crop_y}
                            className="h-10 w-10"
                          />
                        ) : (
                          (person.username || "?").slice(0, 1)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">
                          @{person.username || "friend"}
                        </span>
                        {isMe ? (
                          <span className="block text-[12px] text-muted-foreground">You</span>
                        ) : friends ? (
                          <span className="block text-[12px] text-muted-foreground">Friends</span>
                        ) : followsBack ? (
                          <span className="block text-[12px] text-muted-foreground">Follows you</span>
                        ) : null}
                      </span>
                    </button>
                    {!isMe ? (
                      <button
                        type="button"
                        onClick={() => onFollow(person)}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                          following
                            ? "border border-border text-foreground"
                            : "bg-foreground text-background"
                        )}
                      >
                        {friends ? "Friends" : following ? "Following" : followsBack ? "Follow back" : "Follow"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">No one found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}