export type ActionResult = { ok: true } | { ok: false; message: string };

export type GuessResult =
  | { ok: true; marks: boolean[]; caught: boolean; doneGuessing: boolean }
  | { ok: false; message: string };
