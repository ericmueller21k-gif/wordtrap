import type { Rack } from "@wordtrap/engine";
import { Tile } from "./Tile.tsx";
import type { WordBuilder } from "./useWordBuilder.ts";

export function RackView({ rack, builder, disabled }: { rack: Rack; builder: WordBuilder; disabled?: boolean }) {
  return (
    <div class="rack" role="group" aria-label="Your tiles">
      {builder.order.map((rackIndex) => {
        const used = builder.placed.has(rackIndex);
        return (
          <button
            type="button"
            key={rackIndex}
            class={`rack-cell ${used ? "rack-cell-used" : ""}`}
            disabled={used || disabled}
            onClick={() => builder.place(rackIndex)}
            aria-label={`Place ${rack[rackIndex]}`}
          >
            {!used && <Tile letter={rack[rackIndex]!} />}
          </button>
        );
      })}
    </div>
  );
}
