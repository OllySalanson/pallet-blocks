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

## A pause during READY skipped the countdown

- Seen: pausing while READY was up, then resuming, went straight into play. READY and GO! never showed and the first piece was already falling, so the player lost the warning the countdown gives.
- Changed: the pause menu remembers how far into READY and GO! it came (`pauseOver` and `resumeFrom` in `src/app/screens.ts`). RESUME, Esc and the `resume()` API go back into the countdown where it stopped, and keys held through the pause wait for GO as they do at the start.
- How a player notices: pause during READY and resume, and the countdown carries on to GO! before the piece moves.

## Hold and turns pressed while lines clear

- Seen: after a line clear the cleared rows flash for about a third of a second before the next piece appears. Hold or a turn pressed in that gap was thrown away. On seed 7, C pressed just after the clearing drop left HOLD empty and the next O came into play anyway.
- Changed: `Game` in `src/core/game.ts` remembers a hold and the turns pressed while lines clear and applies them to the next piece as it appears: the hold first, then the turns, through the normal hold and kick rules.
- How a player notices: press hold or turn for the next piece while the lines are still flashing, and it comes in already held or already turned, so fast play after a clear no longer loses inputs.

## A piece pushed above the field by a high stack

- Seen: when the stack reaches the top, a new piece appears one row higher, in the hidden row above the field, and that part of it was never drawn. On seed 7, hard dropping every piece in place, the last T showed as a flat bar of three with its nub missing, and the cells it locked up there stayed invisible.
- Changed: the renderer (`rowOffset` in `src/render/scene.ts`) now draws the buffer row just above the field in the strip between the well and the title bar, for the falling piece, its ghost and locked cells. The game-over curtain greys that row too.
- How a player notices: in a top-out scramble the whole piece stays visible, poking out above the well, so its shape and turns can still be read.

## Callouts ran out during a pause

- Seen: on seed 7, a SINGLE +100 callout was up when the game was paused straight after the clear. It ran out behind the pause menu, so on resume the panel was back to TIME and the player never got to read it. The same was true of the big clear and level banners and the lock flash.
- Changed: callouts, banners, the lock flash and the drop trail now keep time by a clock that stands still while paused (`stepEffectsClock` in `src/app/screens.ts`, passed to the renderer as `effectsMs`).
- How a player notices: pause just after a clear or a level-up and resume, and the callout or banner is still there with the rest of its time to run.

## A stub of the stack above the results window

- Seen: on seed 7, hard dropping every piece in place, the GAME OVER results window covered the well but not the thin strip between it and the title bar. The topped-out block in the row above the field showed there as a grey stub poking out above the window.
- Changed: the results screen leaves the row above the field out (`topRowShown` in `src/render/scene.ts`). It is still drawn in play, during the game-over curtain and behind the name entry window, where the well top is in view.
- How a player notices: the results window now sits cleanly under the title bar, with nothing sticking out above it.
