import React from "react";
import { createPortal } from "react-dom";
import { BookOpen, Clapperboard, MessageCircle, Music } from "lucide-react";
import AccountIcon from "@/components/voice/AccountIcon";
import AccountProfile from "@/components/voice/AccountProfile";
import DeleteAccount from "@/components/voice/DeleteAccount";

function Chevron() {
  return (
    <svg className="account-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m7.5 4.5 5 5.5-5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AccountSheet({
  open,
  user,
  remaining,
  ready,
  wallet,
  onReels,
  onMessages,
  onRap,
  onKnowledge,
  onGetCoins,
  onClose,
  onSignIn,
  onSwitchAccount,
  onSignOut,
}) {
  if (!open) return null;

  const signedIn = !!user;
  const usage = !ready
    ? "Checking…"
    : signedIn
      ? `${remaining} left`
      : `${remaining} free ${remaining === 1 ? "message" : "messages"}`;

  // drawn over the whole screen, so the tab bar never shows through the panel
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close account"
        onClick={onClose}
        className="account-backdrop absolute inset-0"
      />

      <section role="dialog" aria-modal="true" aria-label="Account" className="account-sheet">
        <div className="account-top">
          <span className="account-brand">Babembe Babondo GS</span>
          <div className="account-tools">
            <span className="account-usage">{usage}</span>
            <AccountIcon label="Close account" onClick={onClose} />
          </div>
        </div>

        <div className="account-panel">
          <AccountProfile user={user} wallet={wallet} onGetCoins={onGetCoins} />

          <div className="account-actions">
            {signedIn ? (
              <>
                {user?.role === "admin" ? (
                  <button type="button" className="account-action" onClick={onKnowledge}>
                    <span className="account-action-label">
                      <BookOpen className="h-4 w-4" />
                      Assistant knowledge
                    </span>
                    <Chevron />
                  </button>
                ) : null}
                <button type="button" className="account-action" onClick={onRap}>
                  <span className="account-action-label">
                    <Music className="h-4 w-4" />
                    Rap Studio
                  </span>
                  <Chevron />
                </button>
                <button type="button" className="account-action" onClick={onMessages}>
                  <span className="account-action-label">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </span>
                  <Chevron />
                </button>
                <button type="button" className="account-action" onClick={onReels}>
                  <span className="account-action-label">
                    <Clapperboard className="h-4 w-4" />
                    Reels
                  </span>
                  <Chevron />
                </button>
                <button type="button" className="account-action" onClick={onSwitchAccount}>
                  <span>Switch account</span>
                  <Chevron />
                </button>
                <button type="button" className="account-action" onClick={onSignOut}>
                  <span>Sign out</span>
                  <Chevron />
                </button>
                <DeleteAccount />
              </>
            ) : (
              <button
                type="button"
                className="account-action account-action-neutral"
                onClick={onSignIn}
              >
                <span>Continue with Google</span>
                <Chevron />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}