/** Seven upper-case letters. Duplicates allowed, order is the deal order. */
export type Rack = readonly string[];

export interface Square {
  /** 1-based slot on the board, as in spec.md. */
  slot: number;
  multiplier: number;
}

export interface Board {
  letterSquare: Square;
  wordSquare: Square;
}

export interface Round {
  rack: Rack;
  board: Board;
}

/** What the opponent learns about a locked word. */
export interface Clue {
  length: number;
  tileScore: number;
}
