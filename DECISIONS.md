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

## Milestone 3: playable on one phone

- **Stack: Vite + Preact + TypeScript.** Preact is a 4 KB React-compatible UI library. The whole app is about 15 KB
  of gzipped JavaScript, which keeps taps and screen changes instant. There's no router, because screens are app
  state with no page loads. The engine runs unchanged in the browser.
- **Match flow lives in the engine** (`src/match.ts`) as a pure state machine with `viewFor(state, seat)`. That
  function applies the spec's visibility table, so pass-the-phone play now and the server in milestone 4 share the
  same rules and the same hiding.
- **The creator can lock in a round 1 word before the friend joins.** The spec's Waiting screen ("Word locked in.
  Waiting for Sam." with an invite link) implies this.
- **Placing tiles:** tapping a rack tile fills the first open slot, and tapping a placed tile sends it back, which
  can leave a gap. A word with a gap can't be locked in ("Close the gap..."). This follows the spec's "next open
  slot" literally.
- **The square label sits as a badge above a covering tile,** so 2L/3L/2W/3W stay readable.
- **Pass-the-phone:** a "Pass the phone to Sam" screen goes between turns, so neither player sees the other's
  word. Whoever holds the phone keeps it while they have something to do. Because the spec lets a player set their
  next word without waiting, one player sometimes plays two steps in a row.
- **Smallest supported width is 375 px** (iPhone SE 2nd/3rd gen and every current iPhone). Seven 44 px tiles don't
  fit on the old 320 px phones, which iOS 18 no longer supports.
- **Tests:** Playwright plays a full match on emulated iPhone 13, iPhone SE (3rd gen) and Pixel 7, and checks that
  game screens don't scroll and that every button is at least 44 px. Chromium stands in for Safari here, so the
  real-iPhone check in milestone 5 still matters.

## Milestone 4: online play

- **Hosting: Cloudflare Workers + Durable Objects, free plan.** This is the cheapest managed option: $0, no card,
  and one service for the app, the API and storage. Each match is one Durable Object named by its join code, holding
  the racks, boards and secret words in its own SQLite-backed storage. So there's no separate database to set up,
  and moves can't race because a Durable Object handles one request at a time. Deploys come from GitHub through
  Cloudflare's Git integration (`DEPLOY.md`). No paid service is used, so the spec's approval rule isn't triggered,
  but Eric has to create the account.
- **The server is the authority.** It validates every word and guess with the same engine and sends each device
  only `viewFor(seat)`. Tests check that the other word never appears in a player's response before the reveal.
- **Codes:** join codes are 6 characters from an alphabet with no I, L, O, 0 or 1. The rejoin code is the join code
  plus a 6-character personal secret (`K7PM2Q-W3XRT9`). One "Join with a code" box takes either. A rejoin hands back
  the same seat token, so the same game works on a second device or in the installed home-screen app.
- **Seat token:** 24 random bytes, kept in `localStorage` with the last view of each match, so a match opens
  instantly with no spinner and then refreshes.
- **Updates: polling instead of push** (the spec has no push in v1). Every 5 s while waiting, every 30 s after 10
  quiet minutes, never while the app is in the background, and Home refreshes when opened. This keeps one active
  match well inside the free Durable Object allowance.
- **Rematch:** the first player to tap Rematch creates the new match, with credentials for both seats stored in the
  old one. The other player's final screen then shows "Play Eric's rematch".
- **Invite link:** `https://<host>/join/K7PM2Q` opens the join screen. If this device is already in that game, it
  opens the game instead.
- **Not built:** cleaning up abandoned matches (storage is tiny), and rate limiting (not a sensitive app).

## Milestone 5: install polish

- **Manifest:** `display: standalone`, portrait, green theme, with 192/512 icons plus a maskable icon (a "W" tile,
  drawn in `public/icons/icon.svg`; `scripts/make-icons.mjs` renders the PNGs). iPhone gets
  `apple-mobile-web-app-capable` and a translucent status bar. The layout already pads for the notch and home bar.
- **Service worker** (generated at build time with every built file precached): the app opens instantly and works
  offline for pass-the-phone games. The API is never cached. Pages are fetched fresh whenever online, so a deploy
  shows up the next time the app is opened (cache only when offline). Changed Oct 2 after an update didn't appear.
- **Add to Home Screen:** Android/Chrome gets a real **Install app** button (`beforeinstallprompt`). iPhone Safari has
  no install API, so it gets a short instruction card. Either card can be dismissed for good.
- **iPhone storage:** the installed app doesn't share storage with Safari, so the iPhone card lists the rejoin codes
  for games in progress, and the installed app's empty Home says how to bring them over with **Join with a code**.
- **Not done (it needs Eric):** testing on a real iPhone and a real Android phone, using `TESTING.md`.
- **Not done (optional):** iPhone launch splash images (iOS needs one per screen size). The app shows its own splash
  for the moment it takes to load.

## Rule changes from Eric (Oct 2, 2026, after the first deploy)

- **Every real word is playable** (`dictionary.allRealWords`). DOLT was rejected as "too uncommon", which wasn't what
  Eric wanted. The deny list (names, a few slurs) and the LDNOOBW offensive list still apply. The frequency cutoff
  is kept behind the setting in case it's wanted again.
- **A reusable letter each round.** One rack letter, the same for both players, can be used any number of times.
  It's picked at random from the rack, skipping J, K, Q, V, W, X, Y and Z (`reusableLetter.excluded`). Its tile shows
  an ∞ badge and stays in the rack when placed. Rounds dealt before this change have no reusable letter.
- **A rack with a Q always has a U** (`qNeedsU`): if a Q is drawn without a U, one of the other tiles becomes a U.
- **Length bonus +2 / +5 / +10 / +20** for 4 / 5 / 6 / 7 letters (it was +1 / +5 / +10 for 5 / 6 / 7). The spec's
  worked examples are still tested, using the spec's original bonus.
- **Balance effect** (`reports/balance.md`): the catch rate drops from 71% to 67%, and the best word to set is now
  usually 4 letters (52%), with 5 letters at 16% and 6 at 4%. Before, it was mostly 3 letters. Word choice is more
  varied, so guesses stay at 2.

## After the first real game (Eric, Oct 2, 2026)

- **Rounds now wait for both players** (`waitForRoundEnd: true`). In the first real game, a player who finished
  guessing jumped into the next round, then got pulled back to the previous round's results when the other player
  finished. Now a player who finishes guessing sees "Waiting for Sam to finish guessing", then the round results,
  then the next round. This reverses the spec's step 6 at Eric's request; setting it to `false` restores the
  spec's flow.
- **Scoreboard from any game screen:** the score in the header ("You · Sam 32–25") opens a round-by-round table
  with a two-line reminder of how scoring works.
- **Results explain the points:** each word now reads like "WINED was worth 30. Choder caught it on guess 2, so
  Choder +15 (half, rounded up) and 67 +0." The first game showed the right totals, but it wasn't clear why a
  caught player's opponent scored.
