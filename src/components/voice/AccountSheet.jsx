import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Clapperboard,
  FileText,
  Flag,
  Languages,
  MessageCircle,
  Mic,
  ShieldCheck,
} from "lucide-react";
import AccountIcon from "@/components/voice/AccountIcon";
import AccountProfile from "@/components/voice/AccountProfile";
import ChangePasswordSheet from "@/components/voice/ChangePasswordSheet";
import DeleteAccount from "@/components/voice/DeleteAccount";
import { langLabel, nextLangMode, saveLangMode, useLangMode } from "@/lib/langMode";
import { otherLoginEmail } from "@/lib/loginAlias";

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
  onStudio,
  onKibembe,
  onKnowledge,
  onReports,
  onGetCoins,
  onClose,
  onSignIn,
  onSwitchAccount,
  onSignOut,
}) {
  // the language being answered in: it stands across turns and calls, and one tap moves it on
  const lang = useLangMode();

  if (!open) return null;

  const signedIn = !!user;
  // the other spelling of this same account, shown on the row that switches to it
  const otherEmail = otherLoginEmail(user?.email);
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
            <button
              type="button"
              className="account-action account-action-neutral"
              onClick={() => saveLangMode(nextLangMode(lang))}
              aria-label={`Answered in ${langLabel(lang)} — tap to change the language`}
            >
              <span className="account-action-label">
                <Languages className="h-4 w-4" />
                Answer language
              </span>
              <span className="account-coins">{langLabel(lang)}</span>
            </button>

            {signedIn ? (
              <>
                {user?.role === "admin" ? (
                  <>
                    <button type="button" className="account-action" onClick={onKnowledge}>
                      <span className="account-action-label">
                        <BookOpen className="h-4 w-4" />
                        Assistant knowledge
                      </span>
                      <Chevron />
                    </button>
                    <button type="button" className="account-action" onClick={onReports}>
                      <span className="account-action-label">
                        <Flag className="h-4 w-4" />
                        Reports
                      </span>
                      <Chevron />
                    </button>
                  </>
                ) : null}
                <button type="button" className="account-action" onClick={onStudio}>
                  <span className="account-action-label">
                    <Mic className="h-4 w-4" />
                    Gloire Studio
                  </span>
                  <Chevron />
                </button>
                <button type="button" className="account-action" onClick={onKibembe}>
                  <span className="account-action-label">
                    <Languages className="h-4 w-4" />
                    Kibembe chat
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
                {/* the app's own policy and terms, and the page that ends an account, stand on the
                    main screen itself — where the stores ask for them to be reachable */}
                <Link to="/privacy" className="account-action" onClick={onClose}>
                  <span className="account-action-label">
                    <ShieldCheck className="h-4 w-4" />
                    Privacy Policy
                  </span>
                  <Chevron />
                </Link>
                <Link to="/terms" className="account-action" onClick={onClose}>
                  <span className="account-action-label">
                    <FileText className="h-4 w-4" />
                    Terms of use
                  </span>
                  <Chevron />
                </Link>
                {/* the row shows itself only while a password change stands open for this
                    account, and it is gone the moment the change is made */}
                <ChangePasswordSheet user={user} />
                <button type="button" className="account-action" onClick={onSwitchAccount}>
                  <span>Switch account</span>
                  {otherEmail ? <span className="account-coins">{otherEmail}</span> : <Chevron />}
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