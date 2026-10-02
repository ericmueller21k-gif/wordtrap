import { letterValue } from "@wordtrap/engine";

interface TileProps {
  letter: string;
  /** Visual state for guess feedback. */
  mark?: "hit" | "miss";
  size?: "md" | "sm";
  /** Index in a row, for staggered reveal animations. */
  delay?: number;
  pop?: boolean;
}

export function Tile({ letter, mark, size = "md", delay = 0, pop }: TileProps) {
  const cls = ["tile", `tile-${size}`, mark && `tile-${mark}`, pop && "tile-pop"].filter(Boolean).join(" ");
  return (
    <span class={cls} style={mark ? { animationDelay: `${delay * 90}ms` } : undefined}>
      <span class="tile-letter">{letter}</span>
      <span class="tile-value">{letterValue(letter)}</span>
    </span>
  );
}
