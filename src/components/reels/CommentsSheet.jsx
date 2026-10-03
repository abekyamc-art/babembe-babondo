import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function CommentsSheet({ open, onOpenChange, reel, me, username, onAdded }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open || !reel) return undefined;
    let alive = true;
    setLoading(true);
    base44.entities.ReelComment.filter(
      { reel_id: reel.id },
      { sort: "-created_date", limit: 50 }
    )
      .then((page) => {
        if (alive) setComments(page?.items || []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, reel]);

  const submit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || posting || !reel) return;
    setPosting(true);
    try {
      const created = await base44.entities.ReelComment.create({
        reel_id: reel.id,
        author_email: me.email,
        author_username: username || "friend",
        text: value,
      });
      setComments((prev) => [created, ...prev]);
      setText("");
      onAdded?.(reel.id);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal tracking-tight">
            Comments
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            @{reel?.author_username || "friend"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-3 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <span className="text-[13px] font-semibold">@{comment.author_username || "friend"}</span>
                <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">{comment.text}</span>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-[13px] text-muted-foreground">
              No comments yet. Be the first.
            </p>
          )}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a comment…"
            aria-label="Add a comment"
            className="h-10 flex-1 text-[14px]"
          />
          <Button type="submit" disabled={!text.trim() || posting} className="gap-1.5">
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}