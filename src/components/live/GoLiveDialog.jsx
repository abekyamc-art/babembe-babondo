import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { usernameFrom } from "@/lib/social";

export default function GoLiveDialog({ open, onOpenChange, user, profile, onStarted }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const room = await base44.entities.LiveRoom.create({
        host_email: user.email,
        host_username: profile?.username || usernameFrom(user),
        host_avatar_url: profile?.avatar_url || "",
        title: title.trim() || "Live now",
        status: "live",
        started_at: new Date().toISOString(),
      });
      setTitle("");
      onOpenChange(false);
      onStarted(room);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal tracking-tight">
            Go live
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed">
            Your room opens right away with your camera live. People ask to join, you let them in,
            and everyone in the room hears them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="live-title">What's it about?</Label>
          <Input
            id="live-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Story time in Babembe"
          />
        </div>

        <DialogFooter className="mt-1">
          <Button onClick={start} disabled={busy} className="w-full gap-2" size="lg">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Opening…" : "Start the live"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}