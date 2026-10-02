import type { Dictionary } from "./dictionary.ts";
import { randomInt, weightedPick, type Rng } from "./rng.ts";
import { DEFAULT_SETTINGS, type Settings, type SquareSettings } from "./settings.ts";
import type { Board, Rack, Round, Square } from "./types.ts";

export function fullBag(settings: Settings = DEFAULT_SETTINGS): string[] {
  const bag: string[] = [];
  for (const [letter, count] of Object.entries(settings.bag)) {
    for (let i = 0; i < count; i++) bag.push(letter);
  }
  return bag;
}

/** Draws a rack without replacement from a fresh bag. No filtering. */
export function drawRack(rng: Rng, settings: Settings = DEFAULT_SETTINGS): Rack {
  const bag = fullBag(settings);
  if (bag.length < settings.rackSize) throw new Error("Bag is smaller than the rack");
  const rack: string[] = [];
  for (let i = 0; i < settings.rackSize; i++) {
    const pick = randomInt(rng, 0, bag.length - 1);
    rack.push(bag[pick]!);
    bag[pick] = bag[bag.length - 1]!;
    bag.pop();
  }
  return rack;
}

export interface RackStats {
  commonWords: number;
  longWords: number;
}

export function rackStats(rack: Rack, dictionary: Dictionary, settings: Settings = DEFAULT_SETTINGS): RackStats {
  const words = dictionary
    .playableWords(rack)
    .filter((w) => w.length >= settings.minWordLength && w.length <= settings.rackSize);
  return {
    commonWords: words.length,
    longWords: words.filter((w) => w.length >= settings.rackFilter.longWordLength).length,
  };
}

export function isRackPlayable(rack: Rack, dictionary: Dictionary, settings: Settings = DEFAULT_SETTINGS): boolean {
  const stats = rackStats(rack, dictionary, settings);
  return (
    stats.commonWords >= settings.rackFilter.minCommonWords && stats.longWords >= settings.rackFilter.minLongWords
  );
}

/** Draws racks until one passes the rack filter. */
export function generateRack(rng: Rng, dictionary: Dictionary, settings: Settings = DEFAULT_SETTINGS): Rack {
  for (let attempt = 0; attempt < settings.rackFilter.maxRedraws; attempt++) {
    const rack = drawRack(rng, settings);
    if (isRackPlayable(rack, dictionary, settings)) return rack;
  }
  throw new Error(`No playable rack after ${settings.rackFilter.maxRedraws} draws; check the rack filter settings`);
}

function drawSquare(rng: Rng, square: SquareSettings, excludeSlot?: number): Square {
  const slots: number[] = [];
  for (let s = square.minSlot; s <= square.maxSlot; s++) if (s !== excludeSlot) slots.push(s);
  if (slots.length === 0) throw new Error("No slot available for square");
  return {
    slot: slots[randomInt(rng, 0, slots.length - 1)]!,
    multiplier: weightedPick(rng, square.multipliers, square.weights),
  };
}

export function generateBoard(rng: Rng, settings: Settings = DEFAULT_SETTINGS): Board {
  const letterSquare = drawSquare(rng, settings.letterSquare);
  const wordSquare = drawSquare(rng, settings.wordSquare, letterSquare.slot);
  return { letterSquare, wordSquare };
}

export function generateRound(rng: Rng, dictionary: Dictionary, settings: Settings = DEFAULT_SETTINGS): Round {
  return { rack: generateRack(rng, dictionary, settings), board: generateBoard(rng, settings) };
}

/** All rounds of a match, generated up front (on the server). */
export function generateMatchRounds(rng: Rng, dictionary: Dictionary, settings: Settings = DEFAULT_SETTINGS): Round[] {
  return Array.from({ length: settings.roundsPerMatch }, () => generateRound(rng, dictionary, settings));
}
