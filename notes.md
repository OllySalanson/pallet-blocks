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

## Esc on the high score box threw the score away without warning

- Seen: on seed 7, after NEW HIGH SCORE! 202, the help bar read TYPE YOUR NAME and ENTER DONE. Esc, the usual key for closing a box, quietly skipped the name, and the results said NO SCORES YET: the score was gone and nothing had said Esc would do that.
- Changed: `helpFor` in `src/render/scene.ts` now gives name entry TYPE YOUR NAME, ENTER SAVE and ESC SKIP, and the README says Esc skips and the score is not kept.
- How a player notices: the bar under the high score box says what each key does, so a player who wants the score kept knows to press Enter.

## A soft drop held into a pause ran the menu cursor off

- Seen: on seed 7, holding Down (soft drop) and pressing Esc opened the pause menu, but the key's auto-repeat went on moving the cursor through RESUME, RESTART and QUIT. When the player let go it was on RESTART, so the Enter or Space meant to resume threw the game away. Holding a direction into the GAME OVER window did the same.
- Changed: `FreshKeys` in `src/app/keys.ts` remembers which keys went down since the screen last changed. A menu ignores the repeats of a key that was already down when it opened; a key pressed in the menu still repeats as before.
- How a player notices: pause while soft dropping and the cursor stays on RESUME until you press a key in the menu.

## Closing the game left a dark, focusable box on the host page

- Seen: on the embed page, a game mounted into a box and then closed with `destroy()` left the box with `tabindex="0"`, `role="application"`, the game's aria-label, a dark background over the host's own, and its focus outline turned off. The README says `destroy()` leaves the element as it found it. A keyboard player tabbing through the host page landed on an empty box with no focus ring, and a screen reader still called it the game.
- Changed: `borrowElement` in `src/app/borrow.ts` notes the host element's class, attributes and inline styles before the game sets its own, and the game puts them all back on `destroy()`. The game now sets CSS longhands only, so putting a style back cannot wipe a host's own setting.
- How a player notices: once the console closes, Tab skips the empty box, and the host's own look comes back.

## A second hold did nothing at all

- Seen: on seed 7, pressing C held the piece and greyed it out. Pressing C again for the same piece gave no sound and no movement, so a player hammering hold in a hurry could not tell whether the key had been read or the game had dropped it. With sound off there was no sign at all.
- Changed: the core `Game` now reports a `holdRefused` event when hold is pressed for a piece that has already used it. The app plays a low double knock and shakes the greyed held piece 2px side to side for 160ms (`holdShakeOffset` in `src/render/scene.ts`). The shake runs on the effects clock, so it stops while paused.
- How a player notices: press hold twice and the HOLD piece wobbles with a knock, which says "used already, wait for the next piece".

## BEST showed a score Esc had thrown away

- Seen: on seed 7 with no saved scores, a game ending on 174 asked for a name, and Esc skipped it. The GAME OVER results then said NO SCORES YET while the BEST box beside them still read 174, a best the game had not kept. The two boxes on one screen disagreed.
- Changed: `bestShown` in `src/render/scene.ts` decides the BEST figure. During play and name entry it still rises with the score as soon as the score passes the best. On the results it shows the top of the saved table (or the host's leaderboard), so it always agrees with the table on screen.
- How a player notices: skip the name and BEST stays at the old best; save it and BEST shows the new score, the same as the top row of HIGH SCORES.

## No sign of how long a resting piece had left

- Seen: on seed 7, a piece soft-dropped onto the floor sat there in its full colour for the whole half-second lock delay and then locked with no warning. A player sliding a piece along the stack (or at 20G, where every piece lands at once) had to guess how much time was left, and how many of the 15 resets they had used.
- Changed: the core `Game` reports `lockProgress`, from 0 as the piece touches down or is moved to 1 as it locks, and 0 while it falls. The renderer lays the well's dark over the resting piece in three steps (`lockShade` in `src/render/scene.ts`). In the browser the S piece went from 240,196,84 to 206, 170 and then 137 red about 125ms apart, then gave the cream lock flash.
- How a player notices: a piece on the stack dims as its lock comes. Moving or turning it brings the colour back, which shows the reset worked.

## The start level was forgotten on every visit

- Seen: on seed 7, stepping LEVEL to 5 on the title screen and reloading the page brought the menu back on LEVEL 1, while SOUND OFF from the same visit was kept. A player who always starts on a higher level had to step it up again each time they came back.
- Changed: the LEVEL choice is saved in this browser (`pallet-blocks:start-level`) whenever it changes, and read back on opening through `initialStartLevel` in `src/app/screens.ts`. A host's `startLevel` option still wins, and a saved value that is not a level is ignored or clamped to 1 to 15.
- How a player notices: pick LEVEL 5 once and the menu opens on LEVEL 5 next time, the same way it keeps SOUND OFF.

## Resuming dropped the player straight back into a falling piece

- Seen: on seed 7, pausing with the first piece on row 3 and resuming 0.8s later put the board back and the piece fell to row 4 within the second, with no countdown. The pause menu hides the stack, HOLD and NEXT, so the player was moving a live piece before they had read the board again, which at the higher levels can cost a misplaced piece.
- Changed: `resumeFrom` in `src/app/screens.ts` now sends a pause taken during play back through READY and GO!, as a new game starts. Keys held through the pause wait for GO, and a pause during the countdown still picks it up where it stopped.
- How a player notices: RESUME, Esc, P or the embed's `resume()` show READY over the board, then GO! with its sound, and only then does the piece fall.
