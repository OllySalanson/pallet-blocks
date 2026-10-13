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

## No sign that the keys had stopped reaching the game

- Seen: on the embed page, after clicking the host's Player name box, the game kept showing its usual help bar (ENTER SELECT, ARROWS CHOOSE) but every key went to the host page. Nothing on the screen said why Enter did nothing or how to get the game back. The same happened on the pause menu the game falls into when it loses focus.
- Changed: the renderer is told whether the game has keyboard focus (`focused` in `SceneState`), and `helpFor` in `src/render/scene.ts` swaps the help bar for CLICK HERE TO PLAY while it does not.
- How a player notices: click away from the game and the bottom bar says CLICK HERE TO PLAY; click the game and the usual key hints come back.

## The pause menu let the player plan the queue

- Seen: on seed 7, pausing after the first drop blanked the well, as meant ("a pause is not a free look"), but HOLD and all five NEXT pieces stayed on show beside the menu. A player could pause at any moment and study the coming pieces for as long as they liked.
- Changed: `piecesShown` in `src/render/scene.ts` decides when pieces are drawn. While paused, the stack, the falling piece, the held piece and the NEXT queue are all hidden; the boxes and their headings stay, so the layout does not jump.
- How a player notices: pause and the HOLD and NEXT boxes are empty; resume and the pieces come back, so a pause is a rest, not a planning break.

## Long names ran into their scores on the title screen

- Seen: the title screen's HIGH SCORES box is narrow, and a name sits at its left with the score pushed to its right. A ten-letter name of wide letters (WWWWWWWWWW) left only a pixel or two before a 3-digit score, and next to a score in the millions the two ran into each other and could not be read.
- Changed: `fitName` in `src/render/scene.ts` cuts a name that would come within 4px of its score and ends it with a dot. Names that fit are drawn as they are, and the wider GAME OVER table is unchanged.
- How a player notices: a long name beside a big score shows as, say, WWWWWWW. 1,234,567, with a clear gap, so every row of the table can be read.

## The caret pressed against the name box

- Seen: on seed 7, after a new high score, typing a ten-letter name of wide letters (WWWWWWWWWW) left the caret touching the right edge of the name box, while there was a clear gap before the first letter. Only the name was centred, not the caret after it.
- Changed: `nameLine` in `src/render/scene.ts` centres the name and its caret together, and the box is a little wider (`NAME_FIELD_WIDTH`), so even the widest name has the same room on both sides.
- How a player notices: however long the name, the text and blinking caret sit evenly in the box, and an empty box shows the caret in the middle.

## A new high score below sixth place was nowhere to be seen

- Seen: the high score table keeps ten names, but the GAME OVER window only has room for six. On seed 7, with six scores above 204 already saved, the game said NEW HIGH SCORE!, took the name RED, and then showed a results table without it: no row, no highlight, as if the score had not been kept.
- Changed: `tableRows` in `src/render/scene.ts` picks the rows the results window shows. When the player's entry ranks below the top rows, it takes the last row, numbered with its real place and highlighted. The same goes for a host's leaderboard in the embed.
- How a player notices: place seventh to tenth and the results show the top five, then your own name with its place (say 7) blinking in gold.
