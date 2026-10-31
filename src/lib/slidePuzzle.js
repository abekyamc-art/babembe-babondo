/**
 * The sliding number puzzle that ends an episode, in two sizes: an easy three by three board of eight
 * numbers, and a medium four by four board of fifteen. A new attempt takes the next size in that order
 * and the order goes round again after the medium board, so the ending of a paper is never the same
 * twice running. A tile standing beside the empty space slides into it; a tile standing anywhere else
 * does nothing at all. A board is kept as a list of its places, read from the top-left corner along each
 * row, with nothing at all standing for the empty space — so a board's own length says its size.
 *
 * A board is only ever made by sliding the solved board a good many times, so every arrangement the
 * student is handed can be brought back to order — and a shuffle that happens to land home is made
 * again, so no episode ever opens already solved.
 */
export const EASY_SIZE = 3;
export const MEDIUM_SIZE = 4;

/** The board a paper falls back to when nothing says otherwise. */
export const SLIDE_SIZE = EASY_SIZE;
export const SLIDE_TILES = SLIDE_SIZE * SLIDE_SIZE;

/** How many slides a fresh board is taken through: the medium board is mixed a little further, since
 * it has more places to wander through, while both stay close enough to order to settle quickly. */
const STEPS = { [EASY_SIZE]: 30, [MEDIUM_SIZE]: 50 };

/** How big a board really is, or nothing when the list is not a square board at all. */
export function sizeOf(board) {
  if (!Array.isArray(board)) return 0;
  const size = Math.round(Math.sqrt(board.length));
  return size >= 2 && size * size === board.length ? size : 0;
}

/** Which size an attempt's own turn in the turning order takes: easy, then medium, and round again. */
export function slideSizeFor(attempt = 0) {
  return attempt % 2 === 0 ? EASY_SIZE : MEDIUM_SIZE;
}

/** How a board's size is spoken of beside the puzzle. */
export function slideLevel(size = SLIDE_SIZE) {
  return size === MEDIUM_SIZE ? "medium" : "easy";
}

/** The solved board: one to the last number in order, and the empty space at the bottom-right. */
export function solvedBoard(size = SLIDE_SIZE) {
  const tiles = size * size;
  return Array.from({ length: tiles }, (_, at) => (at === tiles - 1 ? 0 : at + 1));
}

/** Whether a board stands solved: every number in order, the empty space at the bottom-right. */
export function isSolved(board) {
  const size = sizeOf(board);
  if (!size) return false;
  const tiles = size * size;
  return board.every((value, at) => value === (at === tiles - 1 ? 0 : at + 1));
}

/** Where the empty space stands, or nothing when a board holds no empty space at all. */
export function blankAt(board) {
  return Array.isArray(board) ? board.indexOf(0) : -1;
}

/** The places that stand beside a place: right and left along its row, and up and down its column. */
export function neighbours(at, size = SLIDE_SIZE) {
  const row = Math.floor(at / size);
  const col = at % size;
  const near = [];
  if (col > 0) near.push(at - 1);
  if (col < size - 1) near.push(at + 1);
  if (row > 0) near.push(at - size);
  if (row < size - 1) near.push(at + size);
  return near;
}

/** Whether the tile standing at a place may slide into the empty space — the move is legal. */
export function canSlide(board, at) {
  const size = sizeOf(board);
  if (!size) return false;
  if (at < 0 || at >= board.length || board[at] === 0) return false;
  return neighbours(blankAt(board), size).includes(at);
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
export function shuffleBoard(size = SLIDE_SIZE, steps = STEPS[size] || 40) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let board = solvedBoard(size);
    let blank = board.length - 1;
    let came = -1;
    for (let made = 0; made < steps; made += 1) {
      const choices = neighbours(blank, size).filter((at) => at !== came);
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
  const last = solvedBoard(size);
  last[last.length - 1] = last[last.length - 2];
  last[last.length - 2] = 0;
  return last;
}