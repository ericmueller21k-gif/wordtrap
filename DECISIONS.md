# Decisions

Judgement calls made while building, with the reason for each. Eric asked to be involved as little as possible, so
these were made without a review. Each one is easy to reverse. Most are a single line in
`packages/engine/src/settings.ts` or in `packages/engine/data/allow.txt` / `deny.txt`.

## Milestone 1: rules engine and dictionary

- **Real-word list: ENABLE (public domain), not an official Scrabble list.** OSPD, NWL and Collins are copyrighted
  and have no open licence, and the spec says to check licensing first. ENABLE covers the same ground. The hard part
  is the common list, which no Scrabble list solves.
- **Common list: the 10,000 most frequent real 3-7 letter words** from OpenSubtitles 2018 (FrequencyWords,
  CC BY-SA 4.0), plus their regular inflections.
- **Inflections must also appear at least 20 times in the subtitle corpus** (setting
  `dictionary.inflectionMinCount`). The spec's literal rule ("counts as common if it is a real word") let in about
  4,700 odd forms such as ABODED, HEEDER and LOOED, which goes against "cunning over obscure vocabulary". The
  threshold keeps MESAS, HUBS and CORKED. Set it to 0 to restore the literal rule.
- **Offensive words:** LDNOOBW (CC BY 4.0) and its plurals are removed from both lists, plus a few slurs it misses
  (in `deny.txt`). This also blocks some mild words (BUTT, SUCK, ESCORT). That's accepted for a game sent to friends,
  and `allow.txt` can rescue any of them.
- **Names:** ENABLE spells many names as obscure lower-case words (LAURA, LOGAN, RILEY). About 130 are in
  `deny.txt`. Names that are everyday words (BILL, MARK, ROSE, JACK, HOPE) stay playable.
- **Validation order:** letters A-Z, then length, then tiles, then dictionary. A word that fails several checks gets
  the first message.

## Milestone 2: balance report (`reports/balance.md`)

- **Guesses per word: 3 → 2.** With the spec's starting values, the simple guesser catches 94% of words. Every word
  then has negative value to its owner, and the best play on 90% of deals is a cheap 3-letter word. The positional
  feedback is so informative that 3 guesses nearly always solve a clue group. With 2 guesses the catch rate is 71%,
  the best word splits between 3 and 4 letters, and setting a word is worth something again. One guess gives the
  most varied play (best word spread across 4-6 letters, 24% catch rate), but it removes the slot feedback, which
  is central to the design, so it wasn't chosen.
- **Catch reward stays 50%.** Raising it to 100% makes cheap 3-letter words even more dominant.
- **Length bonus stays +1/+5/+10.** It barely changes the best word, because 6- and 7-letter words almost always
  have a unique clue (46% and 77%), so the simple guesser always catches them. Real players have to find a
  7-letter anagram themselves, which is much harder than for this guesser, which knows every word. That makes
  long words the main thing to watch in playtests.
- **Caveat:** the simple guesser knows every playable word. People don't, so real catch rates will be lower than
  the report's, most of all for long words. If playtests show people rarely catch, go back to 3 guesses.
- **AWOL added to `deny.txt`** (abbreviation).
