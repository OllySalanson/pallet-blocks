# Play-testing notes

One short section per iteration: what a player saw, what changed, and how a player uses or notices it.

## Ctrl rolls into the next key

- Seen: Ctrl turns a piece anticlockwise, but any game key pressed while Ctrl was still down was thrown away as a browser shortcut. Turning with Ctrl and rolling straight into Space did not drop the piece, and Ctrl then Right did not move it.
- Changed: `isBrowserShortcut` in `src/app/keys.ts` decides which presses belong to the browser. During play, Ctrl with a game key stays the game's. Ctrl+R, Ctrl+W, Alt and Meta chords, and every Ctrl chord outside play still go to the browser.
- How a player notices: fast Ctrl-then-drop or Ctrl-then-move rolls now do what they should, with no lost drops.

## Keys held through READY or a pause

- Seen: holding Left from the start of READY did nothing at GO. The piece sat in its spawn column, because the press was dropped during READY and the browser sends no fresh press for a key already down. The same happened after a pause: a direction still held, or pressed in the pause menu, was dead on resume until pressed again.
- Changed: `HeldKeys` in `src/app/keys.ts` tracks which move and soft-drop keys are down, in press order. The app presses them for the game the moment GO comes up and on every resume. It forgets them when the game loses focus or the tab is hidden, since the keyups are lost then.
- How a player notices: hold a direction during READY and the first piece moves at GO, then slides on with auto-repeat. A direction or soft drop held through a pause carries on when play resumes.
