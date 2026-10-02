import { useMemo, useState } from "preact/hooks";
import type { Rack } from "@wordtrap/engine";

/**
 * Building a word by tapping rack tiles. Tapping a rack tile fills the first
 * open slot; tapping a placed tile sends it back (which can leave a gap).
 * Key the owning component by round so a new rack starts fresh.
 */
export function useWordBuilder(rack: Rack, slotCount: number) {
  const [order, setOrder] = useState(() => rack.map((_, i) => i));
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(slotCount).fill(null));

  return useMemo(() => {
    const placed = new Set(slots.filter((s): s is number => s !== null));
    const firstGap = slots.indexOf(null);
    const filled = firstGap === -1 ? slots.length : firstGap;
    const hasGap = slots.slice(filled).some((s) => s !== null);
    const word = slots
      .slice(0, filled)
      .map((i) => rack[i!])
      .join("");
    return {
      order,
      slots,
      placed,
      word,
      hasGap,
      letters: slots.map((i) => (i === null ? null : rack[i]!)),
      place(rackIndex: number) {
        if (placed.has(rackIndex) || firstGap === -1) return;
        setSlots(slots.map((s, i) => (i === firstGap ? rackIndex : s)));
      },
      unplace(slotIndex: number) {
        if (slots[slotIndex] === null) return;
        setSlots(slots.map((s, i) => (i === slotIndex ? null : s)));
      },
      clear() {
        setSlots(Array(slotCount).fill(null));
      },
      shuffle() {
        const next = [...order];
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j]!, next[i]!];
        }
        setOrder(next);
      },
    };
  }, [order, slots, rack, slotCount]);
}

export type WordBuilder = ReturnType<typeof useWordBuilder>;
