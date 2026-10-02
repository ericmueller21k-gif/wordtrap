# Checking Word Trap on a real phone

The automated tests play every screen on emulated phones (iPhone 13, iPhone SE, Pixel 7), but they use Chrome's
engine. Safari on a real iPhone is the one check they can't do. About 10 minutes, with a friend:

1. **iPhone, in Safari:** open the game link, tap **New game**, enter your name, and send the invite to a friend.
2. **Install:** tap Share, then **Add to Home Screen**, and open Word Trap from the home screen. It should open full
   screen with no Safari bars, and the top and bottom shouldn't be hidden behind the notch or the home bar.
3. **Rejoin in the installed app:** it starts empty, because iPhone keeps it separate from Safari. Tap **Join with a
   code** and enter the rejoin code shown on the waiting screen (or on the "Put Word Trap on your home screen" card in
   Safari). Your game should appear.
4. **Play a round** with your friend. Check that:
   - the keyboard never appears while playing (only for names and codes)
   - taps feel instant, screens don't scroll or zoom, and pulling down doesn't reload
   - the 2L/3L/2W/3W labels stay readable with a tile on them
   - both light and dark mode look right (switch in Settings → Display & Brightness)
5. **Android, if you have one:** open the link in Chrome. Home shows an **Install app** button, and the installed
   app should open full screen.

Tell Claude anything that looks or feels off, with a screenshot if you can.
