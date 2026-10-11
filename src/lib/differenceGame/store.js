/**
 * What the game keeps on the phone: the highest score and the stars of every level passed, and the
 * three switches the player sets. It stands on the phone itself, so the game opens with the player's own
 * progress whether or not the phone has a good connection.
 */
const KEY = "gloire.find.differences.v1";

const EMPTY = { levels: {}, sound: true, vibration: true, relaxed: false };

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, levels: {} };
    const held = JSON.parse(raw);
    return { ...EMPTY, ...held, levels: held && held.levels ? held.levels : {} };
  } catch {
    return { ...EMPTY, levels: {} };
  }
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* the level still plays: only the record of it is lost */
  }
}

/** A level stands open when it is the first, or when the level before it has been passed. */
export function unlocked(state, id) {
  if (id <= 1) return true;
  return !!state.levels?.[id - 1]?.completed;
}

export function levelRecord(state, id) {
  return state.levels?.[id] || { completed: false, stars: 0, best: 0 };
}

/** The level passed: its best score and its best stars are kept, never lowered. */
export function withWin(state, id, { score, stars }) {
  const held = levelRecord(state, id);
  return {
    ...state,
    levels: {
      ...state.levels,
      [id]: {
        completed: true,
        stars: Math.max(held.stars || 0, stars),
        best: Math.max(held.best || 0, score),
        at: new Date().toISOString(),
      },
    },
  };
}

export function starsEarned(state) {
  return Object.values(state.levels || {}).reduce((sum, row) => sum + (row.stars || 0), 0);
}

export function bestTotal(state) {
  return Object.values(state.levels || {}).reduce((sum, row) => sum + (row.best || 0), 0);
}

export function levelsPassed(state) {
  return Object.values(state.levels || {}).filter((row) => row.completed).length;
}