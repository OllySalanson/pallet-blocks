import { mountPalletBlocks } from './embed';

// The standalone page. `?seed=123` deals a repeatable game.
const root = document.getElementById('game');
if (root) {
  const seed = Number.parseInt(new URLSearchParams(window.location.search).get('seed') ?? '', 10);
  mountPalletBlocks(root, Number.isFinite(seed) ? { seed } : {});
}
