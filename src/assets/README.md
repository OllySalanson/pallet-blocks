# Assets

## `orange-kid.woff2` - the typeface, CC0

Orange Kid is Ray Larabie's pixel-style typeface, version 4.001, the WOFF2
webfont from Typodermic's public-domain collection
(<https://typodermicfonts.com/public-domain/>). It is the same file, byte for
byte, that Escape from Pallet Town ships, so the game's lettering matches the
console it runs on.

**Licence: CC0 1.0 Universal.** The font's own name table says "Released in 2024
under CC0 license. No rights reserved." and points at
<https://creativecommons.org/publicdomain/zero/1.0/>. No attribution is
required; the credit is voluntary.

The game never draws it with plain `fillText`: `src/render/pixelFont.ts` cuts
every glyph to one-bit pixels once and stamps those, so letters are as crisp as
the blocks.

Everything else on screen - blocks, windows, the cursor, the title lettering's
rim - is drawn in code, and every sound is synthesised in the browser.
