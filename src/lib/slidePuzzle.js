/**
 * The sliding number puzzle that ends an episode: eight tiles and one empty space in a three by three
 * board — small enough to be put back in order in a handful of slides, so it ends a paper as a reward
 * rather than a wall. A tile standing beside the empty space slides into it; a tile standing anywhere
 * else does nothing at all. The board is kept as a list of the nine places, read from the top-left
 * corner along each row, with nothing at all standing for the empty space.
 *
 * A board is only ever made by sliding the solved board a good many times, so every arrangement the
 * student is handed can be brought back to order — and a shuffle that happens to land home is made
 * again, so no episode ever opens already solved.
 */
export const SLIDE_SIZE = 3;
export const SLIDE_TILES = SLIDE_SIZE * SLIDE_SIZE;

/** How many slides a fresh board is taken through before it is handed over: enough to mix it, few
 * enough that it stays close to order and quick to settle. */
const SHUFFLE_STEPS = 30;

/** The solved board: one to eight in order, and the empty space at the bottom-right. */
export function solvedBoard() {
  return Array.from({ length: SLIDE_TILES }, (_, at) =>
    at === SLIDE_TILES - 1 ? 0 : at + 1
  );
}

/** Whether a board stands solved: one to eight in order, the empty space at the bottom-right. */
export function isSolved(board) {
  if (!Array.isArray(board) || board.length !== SLIDE_TILES) return false;
  return board.every((value, at) => value === (at === SLIDE_TILES - 1 ? 0 : at + 1));
}

/** Where the empty space stands, or nothing when a board holds no empty space at all. */
export function blankAt(board) {
  return Array.isArray(board) ? board.indexOf(0) : -1;
}

/** The places that stand beside a place: right and left along its row, and up and down its column. */
export function neighbours(at) {
  const row = Math.floor(at / SLIDE_SIZE);
  const col = at % SLIDE_SIZE;
  const near = [];
  if (col > 0) near.push(at - 1);
  if (col < SLIDE_SIZE - 1) near.push(at + 1);
  if (row > 0) near.push(at - SLIDE_SIZE);
  if (row < SLIDE_SIZE - 1) near.push(at + SLIDE_SIZE);
  return near;
}

/** Whether the tile standing at a place may slide into the empty space — the move is legal. */
export function canSlide(board, at) {
  if (!Array.isArray(board) || board.length !== SLIDE_TILES) return false;
  if (at < 0 || at >= SLIDE_TILES || board[at] === 0) return false;
  return neighbours(blankAt(board)).includes(at);
}

/** The board after a tile has slid into the empty space, or nothing when that tile may not move. */
export function slid(board, at) {
  if (!canSlide(board, at)) return null;
  const next = board.slice();
  const blank = blankAt(next);
  next[blank] = next[at];
  next[at] = 0;
  return next;
}

/**
 * A fresh board for a new attempt: the solved board taken through a run of legal slides, so the
 * arrangement it lands on is always one that can be brought back to order. The slide just made is never
 * taken straight back, so the run really walks the board about, and the board it hands over is never
 * already solved.
 */
export function shuffleBoard(steps = SHUFFLE_STEPS) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let board = solvedBoard();
    let blank = SLIDE_TILES - 1;
    let came = -1;
    for (let made = 0; made < steps; made += 1) {
      const choices = neighbours(blank).filter((at) => at !== came);
      const pick = choices[Math.floor(Math.random() * choices.length)];
      const next = slid(board, pick);
      if (!next) break;
      board = next;
      came = blank;
      blank = pick;
    }
    if (!isSolved(board)) return board;
  }
  // a run that somehow always wandered home still hands over a board one slide from order
  const last = solvedBoard();
  last[SLIDE_TILES - 1] = last[SLIDE_TILES - 2];
  last[SLIDE_TILES - 2] = 0;
  return last;
}