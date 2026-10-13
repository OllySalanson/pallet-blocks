# Play-testing notes

One short section per iteration: what a player saw, what changed, and how a player uses or notices it.

## Ctrl rolls into the next key

- Seen: Ctrl turns a piece anticlockwise, but any game key pressed while Ctrl was still down was thrown away as a browser shortcut. Turning with Ctrl and rolling straight into Space did not drop the piece, and Ctrl then Right did not move it.
- Changed: `isBrowserShortcut` in `src/app/keys.ts` decides which presses belong to the browser. During play, Ctrl with a game key stays the game's. Ctrl+R, Ctrl+W, Alt and Meta chords, and every Ctrl chord outside play still go to the browser.
- How a player notices: fast Ctrl-then-drop or Ctrl-then-move rolls now do what they should, with no lost drops.
