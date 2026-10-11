import { defineConfig } from 'vite';

// Two builds from one source tree:
// - the default mode builds the standalone page (`dist/`) for GitHub Pages;
// - `--mode lib` builds the embeddable ES module (`dist-lib/`) that a host page
//   imports `mountPalletBlocks` from.
// Both inline the font, so neither needs a host to serve any file of ours.
export default defineConfig(({ mode }) => ({
  base: './',
  build:
    mode === 'lib'
      ? {
          outDir: 'dist-lib',
          assetsInlineLimit: () => true,
          copyPublicDir: false,
          lib: {
            entry: 'src/embed.ts',
            formats: ['es'],
            fileName: () => 'pallet-blocks.js',
          },
        }
      : {
          outDir: 'dist',
          assetsInlineLimit: () => true,
          rollupOptions: {
            // The game, and a demo of hosting it through the embed API.
            input: { main: 'index.html', embed: 'embed.html' },
          },
        },
}));
