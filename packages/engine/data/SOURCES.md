# Word list sources and licences

The built lists in `words/` are generated from the files below by
`scripts/build-dictionary.ts` (`npm run build:dictionary`). Raw sources are
committed unmodified so the build is reproducible offline.

| File | What it is | Used for | Source | Licence |
| --- | --- | --- | --- | --- |
| `sources/enable1.txt` | ENABLE2K word list (172,823 words), the list behind many word games. No proper nouns or abbreviations. | The real-word list (3-7 letter words) | https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt (mirror of the ENABLE project list) | Public domain (released into the public domain by its authors) |
| `sources/en_50k.txt` | Top 50,000 English words by frequency in the OpenSubtitles 2018 corpus, from the FrequencyWords project | Ranking words for the common-word cutoff | https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/en/en_50k.txt | Content: CC BY-SA 4.0 (code: MIT). Attribution: Hermit Dave, FrequencyWords; corpus: OpenSubtitles (opus.nlpl.eu) |
| `sources/ldnoobw-en.txt` | List of Dirty, Naughty, Obscene, and Otherwise Bad Words (English) | Removing slurs and obscenities (and their plurals) from both lists | https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words | CC BY 4.0. Attribution: Shutterstock and contributors |
| `allow.txt`, `deny.txt` | Hand-edited overrides | Settling playtest disputes | This repo | Same as this repo |

## Licence notes

- `words/common.txt` is selected using the CC BY-SA 4.0 frequency data. To be
  safe, treat `words/common.txt` as CC BY-SA 4.0 too, and credit FrequencyWords
  and OpenSubtitles in the app's credits screen. This affects only the word
  list file, not the game code.
- No official tournament Scrabble list (TWL, NWL, Collins/SOWPODS) is used.
  ENABLE was compiled independently as a public-domain alternative.
- `deny.txt` was first seeded with a review pass against the US Social
  Security Administration's baby-name data (a US government work, public
  domain) to find names that ENABLE also lists as obscure words. That data
  is not committed or used by the build.
