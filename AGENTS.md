# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Never use the word "Tetris", its logo, music or official piece colours anywhere in the repo or game: they are trademarks whose owners take down clones. The game is PALLET BLOCKS; the 4-line clear is a QUAD; piece colours are in `src/render/palette.ts` and deliberately differ from the familiar set.
- The look is borrowed from Escape from Pallet Town (palette and the Orange Kid font); `src/render/palette.ts` and `src/assets/README.md` say where each comes from. Draw everything at the 256x208 native resolution in whole pixels; the app scales it up by whole device pixels (`src/app/scale.ts`). Never draw text with `fillText`: use `PixelFont` (`src/render/pixelFont.ts`), which stamps one-bit glyphs.
- Rules live only in `src/core/` (no DOM) and are covered by vitest; add a test there for any rule change. `src/embed.ts` is the public API that Escape from Pallet Town depends on: keep it backwards compatible and keep the README's Embedding section in step with it.
- A seeded game (`?seed=N` on the page, `seed` option in the embed) is deterministic, which makes end-to-end checks possible: plan moves against `Game` in node and replay them in the browser as `KeyboardEvent`s dispatched on the `.pallet-blocks` element.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
