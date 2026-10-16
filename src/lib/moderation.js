import { base44 } from "@/api/base44Client";

/**
 * The two tools every app with other people's content has to carry: a way to report what is not
 * wanted, and a way to keep a person out of your own way. A report is filed in the reporter's own
 * name and is read by the app's admins; a block is the blocker's own and nobody else's.
 */

export const REPORT_REASONS = [
  { id: "nudity", label: "Nudity or sexual content" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech" },
  { id: "spam", label: "Spam or a scam" },
  { id: "minor", label: "A child at risk" },
  { id: "other", label: "Something else" },
];

export const CONTENT_LABELS = {
  reel: "reel",
  comment: "comment",
  message: "message",
  profile: "profile",
  live: "live room",
};

export function reasonLabel(id) {
  return REPORT_REASONS.find((reason) => reason.id === id)?.label || id;
}

/** Files one report, in the reporter's own name. */
export async function fileReport({ reporterEmail, contentType, contentId, ownerEmail, excerpt, reason, note }) {
  return base44.entities.Report.create({
    reporter_email: reporterEmail,
    content_type: contentType,
    content_id: contentId || "",
    content_owner_email: ownerEmail || "",
    excerpt: (excerpt || "").slice(0, 400),
    reason,
    note: (note || "").slice(0, 600),
    status: "open",
    at: new Date().toISOString(),
  });
}

/** The people this person has blocked, by email. */
export async function blockedEmails(email) {
  if (!email) return [];
  const page = await base44.entities.Block.filter({ blocker_email: email }, { limit: 200 });
  return (page?.items || []).map((row) => row.blocked_email);
}

/** Blocking the same person twice writes the same row again, so the list never doubles. */
export async function blockPerson(blockerEmail, blockedEmail) {
  if (!blockerEmail || !blockedEmail || blockerEmail === blockedEmail) return null;
  return base44.entities.Block.upsert(
    [
      {
        key: `${blockerEmail}|${blockedEmail}`,
        blocker_email: blockerEmail,
        blocked_email: blockedEmail,
        at: new Date().toISOString(),
      },
    ],
    { key: "key" }
  );
}

export async function unblockPerson(blockerEmail, blockedEmail) {
  if (!blockerEmail || !blockedEmail) return null;
  return base44.entities.Block.deleteMany({
    blocker_email: blockerEmail,
    blocked_email: blockedEmail,
  });
}