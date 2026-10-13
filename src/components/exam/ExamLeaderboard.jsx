import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import BoardTotals from "@/components/exam/BoardTotals";
import { BOARD_SIZE, myRecord, rankOf, topScores } from "@/lib/examLeaderboard";

/**
 * The app's public leaderboard: the hundred highest standings, highest first, each one read as the one
 * total it stands on — every episode of the game the student has passed and every episode of the
 * examination, added together — with the student's own standing shown beside them: among the hundred
 * when it stands there, and above them with its own place when it does not.
 */
export default function ExamLeaderboard({ onBack }) {
  const [rows, setRows] = useState(null);
  const [mine, setMine] = useState(null);
  const [myRank, setMyRank] = useState(0);
  const [email, setEmail] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    const open = async () => {
      let list = [];
      let me = null;
      let own = null;
      let place = 0;
      try {
        list = await topScores();
        try {
          me = await base44.auth.me();
        } catch (err) {
          me = null;
        }
        own = me?.email ? await myRecord(me.email) : null;
        place = own ? await rankOf(own.episodes) : 0;
      } catch (err) {
        console.error("The leaderboard could not be read:", err?.message);
        if (alive) setFailed(true);
      }
      if (!alive) return;
      setRows(list);
      setMine(own);
      setMyRank(place);
      setEmail(me?.email || "");
    };

    open();
    return () => {
      alive = false;
    };
  }, []);

  const mineInList = !!email && (rows || []).some((row) => row.user_email === email);

  return (
    <div className="exam-board">
      <div className="exam-ep-head">
        <button type="button" className="exam-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> All seasons
        </button>
        <p className="exam-ep-count">Top {BOARD_SIZE} students</p>
      </div>

      <p className="exam-ep-note">
        The public leaderboard stands open to everyone: each student's place is the episodes they have
        really passed — the game's own episodes and the examination's, added together — and the hundred
        highest of them are shown here, highest first. The one total stands beside every student, so
        five episodes of the game and five of the examination read as ten.
      </p>

      {mine && !mineInList ? (
        <div className="exam-board-mine">
          <span className="exam-board-rank">#{myRank}</span>
          <span className="exam-board-body">
            <span className="exam-board-name">{mine.username || "You"}</span>
            <span className="exam-board-meta">
              Your place · season {mine.season || 1}
            </span>
          </span>
          <BoardTotals total={mine.episodes} />
        </div>
      ) : null}

      {failed ? (
        <p className="exam-empty">
          The leaderboard could not be read just now — open it again in a moment.
        </p>
      ) : rows === null ? (
        <p className="exam-empty">Reading the leaderboard…</p>
      ) : rows.length === 0 ? (
        <p className="exam-empty">
          No standing stands on the leaderboard yet. Pass an episode and yours will be the first.
        </p>
      ) : (
        <div className="exam-board-list">
          {rows.map((row, at) => (
            <div
              key={row.id}
              className={`exam-board-row ${row.user_email === email ? "is-me" : ""}`}
            >
              <span className="exam-board-rank">{at + 1}</span>
              <span className="exam-board-avatar">
                {row.avatar_url ? (
                  <Image src={row.avatar_url} alt="" className="h-full w-full" />
                ) : (
                  String(row.username || row.user_email || "?").slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="exam-board-body">
                <span className="exam-board-name">{row.username || row.user_email}</span>
                <span className="exam-board-meta">Season {row.season || 1}</span>
              </span>
              <BoardTotals total={row.episodes} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}