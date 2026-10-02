import type { Board } from "@wordtrap/engine";
import { Tile } from "./Tile.tsx";

export function squareLabel(board: Board, slot: number): string | null {
  if (board.letterSquare.slot === slot) return `${board.letterSquare.multiplier}L`;
  if (board.wordSquare.slot === slot) return `${board.wordSquare.multiplier}W`;
  return null;
}

interface BoardRowProps {
  board: Board;
  /** Letter (or null) per slot; the row has one slot per entry. */
  letters: (string | null)[];
  marks?: boolean[];
  size?: "md" | "sm";
  onTapSlot?: (index: number) => void;
  /** Hide square labels (e.g. on summary rows). */
  plain?: boolean;
  label?: string;
}

export function BoardRow({ board, letters, marks, size = "md", onTapSlot, plain, label }: BoardRowProps) {
  return (
    <div class={`board-row board-row-${size}`} role="group" aria-label={label}>
      {letters.map((letter, i) => {
        const sq = plain ? null : squareLabel(board, i + 1);
        const kind = sq ? `sq-${sq[0] === "2" ? "d" : "t"}${sq[1]!.toLowerCase()}` : "";
        const content = (
          <>
            {sq && <span class="sq-label">{sq}</span>}
            {letter && (
              <Tile letter={letter} size={size} mark={marks ? (marks[i] ? "hit" : "miss") : undefined} delay={i} pop={!marks} />
            )}
          </>
        );
        return onTapSlot ? (
          <button
            type="button"
            class={`slot ${kind}`}
            onClick={() => onTapSlot(i)}
            aria-label={letter ? `Remove ${letter} from slot ${i + 1}` : `Slot ${i + 1}${sq ? `, ${sq}` : ""}`}
          >
            {content}
          </button>
        ) : (
          <span class={`slot ${kind}`}>{content}</span>
        );
      })}
    </div>
  );
}
