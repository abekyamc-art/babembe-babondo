import React, { useEffect, useRef, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { balanceOf } from "@/lib/coins";
import { ensureProfile, publicFile } from "@/lib/social";

function PersonIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="14" r="6" fill="currentColor" opacity=".88" />
      <path
        d="M8.5 33c1.2-6.2 5-9.2 11.5-9.2S30.3 26.8 31.5 33"
        fill="currentColor"
        opacity=".72"
      />
    </svg>
  );
}

export default function AccountProfile({ user, wallet, onGetCoins }) {
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    ensureProfile(user).then((mine) => {
      if (!alive) return;
      setProfile(mine);
      setUsername(mine.username || "");
    });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="account-identity">
        <div className="account-avatar" aria-hidden="true">
          <PersonIcon />
        </div>
        <div className="account-label">Account</div>
        <div className="account-name">Not signed in</div>
        <div className="account-email">Sign in with Google for 5 messages</div>
      </div>
    );
  }

  const changePicture = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    setBusy("picture");
    try {
      const url = await publicFile(file);
      const saved = await base44.entities.Profile.update(profile.id, { avatar_url: url });
      setProfile(saved);
    } finally {
      setBusy("");
    }
  };

  const saveUsername = async () => {
    const clean = username.trim().replace(/[^a-zA-Z0-9._]/g, "");
    if (!profile || !clean || clean === profile.username) return;
    setBusy("name");
    try {
      const saved = await base44.entities.Profile.update(profile.id, { username: clean });
      setProfile(saved);
      setUsername(saved.username || clean);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="account-identity">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Change profile picture"
          className="account-avatar account-avatar-btn"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="account-img" />
          ) : (
            <PersonIcon />
          )}
          {busy === "picture" ? (
            <span className="account-avatar-busy">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
          ) : null}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={changePicture}
          className="hidden"
        />
        <p className="account-hint">Tap your picture to change it</p>
        <div className="account-label">Account</div>
        <div className="account-name">{user.full_name || "Signed in"}</div>
        <div className="account-email">{user.email}</div>
      </div>

      <div className="account-edit">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-label="Username"
          placeholder="username"
          className="account-input"
        />
        <button
          type="button"
          onClick={saveUsername}
          disabled={busy === "name" || !username.trim() || username.trim() === profile?.username}
          className="account-save"
        >
          {busy === "name" ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="account-hint">This is the name people see on your reels.</p>

      <button type="button" className="account-action" onClick={onGetCoins}>
        <span className="account-action-label">
          <Coins className="h-4 w-4" />
          Coins
        </span>
        {/* the home screen's live balance wins, so this row and the header chip always agree */}
        <span className="account-coins">{balanceOf(wallet || profile)} coins</span>
      </button>
    </>
  );
}