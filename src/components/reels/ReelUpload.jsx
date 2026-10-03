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
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { publicFile, usernameFrom } from "@/lib/social";

export default function ReelUpload({ open, onOpenChange, user, profile, onPosted }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scheduled = when ? new Date(when).getTime() > Date.now() : false;

  const post = async () => {
    if (!file) {
      setError("Pick a video first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const video_url = await publicFile(file);
      const publish_at = (when ? new Date(when) : new Date()).toISOString();
      const reel = await base44.entities.Reel.create({
        author_email: user.email,
        author_username: profile?.username || usernameFrom(user),
        video_url,
        caption: caption.trim(),
        publish_at,
      });
      setFile(null);
      setCaption("");
      setWhen("");
      onOpenChange(false);
      onPosted(reel, new Date(publish_at).getTime() > Date.now());
    } catch (err) {
      setError("That video could not be posted. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal tracking-tight">
            New reel
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed">
            Pick a video, add a caption, and post it now or schedule it for later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reel-video">Video</Label>
            <input
              id="reel-video"
              type="file"
              accept="video/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full text-[13px] text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground"
            />
            {file ? <p className="truncate text-[12px] text-muted-foreground">{file.name}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reel-caption">Caption</Label>
            <Textarea
              id="reel-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Say something about this reel…"
              className="min-h-20 text-[14px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reel-when">Schedule (optional)</Label>
            <Input
              id="reel-when"
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
            />
            <p className="text-[12px] text-muted-foreground">Leave empty to post right now.</p>
          </div>
        </div>

        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

        <DialogFooter className="mt-1">
          <Button onClick={post} disabled={!file || busy} className="w-full gap-2" size="lg">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Uploading…" : scheduled ? "Schedule reel" : "Post reel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}