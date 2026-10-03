import React from "react";
import AccountIcon from "@/components/voice/AccountIcon";

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
      ? `${remaining} left today`
      : `${remaining} free ${remaining === 1 ? "message" : "messages"}`;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close account"
        onClick={onClose}
        className="account-backdrop absolute inset-0"
      />

      <section role="dialog" aria-modal="true" aria-label="Account" className="account-sheet">
        <div className="account-top">
          <span className="account-brand">Village Voice</span>
          <div className="account-tools">
            <span className="account-usage">{usage}</span>
            <AccountIcon label="Close account" onClick={onClose} />
          </div>
        </div>

        <div className="account-panel">
          <div className="account-identity">
            <div className="account-avatar" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="14" r="6" fill="currentColor" opacity=".88" />
                <path
                  d="M8.5 33c1.2-6.2 5-9.2 11.5-9.2S30.3 26.8 31.5 33"
                  fill="currentColor"
                  opacity=".72"
                />
              </svg>
            </div>
            <div className="account-label">Account</div>
            <div className="account-name">
              {signedIn ? user.full_name || "Signed in" : "Not signed in"}
            </div>
            <div className="account-email">
              {signedIn ? user.email : "Sign in with Google for 5 messages a day"}
            </div>
          </div>

          <div className="account-actions">
            {signedIn ? (
              <>
                <button type="button" className="account-action" onClick={onSwitchAccount}>
                  <span>Switch account</span>
                  <Chevron />
                </button>
                <button type="button" className="account-action" onClick={onSignOut}>
                  <span>Sign out</span>
                  <Chevron />
                </button>
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
    </div>
  );
}