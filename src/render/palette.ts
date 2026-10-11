import type { CellValue } from '../core/board';

/**
 * Colours, sampled from Escape from Pallet Town's pixel UI so the game sits on
 * its console as if it were one of its own screens: cream windows with a
 * one-pixel near-black frame, dark ink, and a banded slate-blue backdrop.
 */
export const INK = '#202020';
export const INK_SOFT = '#5d5c47';
export const FRAME = '#171717';
export const CREAM = '#ebeac5';
export const CREAM_LIT = '#f8f7dd';
export const CREAM_DIM = '#d3d2a9';
export const BACKDROP = '#183c52';
export const BACKDROP_BAND = '#1c455e';
export const BAR = '#0b1220';
export const BAR_TEXT = '#ebeac5';
export const BAR_MUTED = '#9cafc7';
export const TEAL = '#55d6be';
export const GOLD = '#f0c454';
export const GOLD_WASH = '#f2e5ab';
export const RED = '#b0201c';
export const SHADOW = 'rgba(11, 18, 32, 0.55)';
/** Around the screen when the space it is given is not its shape: darker than the bars, so they read as part of it. */
export const LETTERBOX = '#05080f';

/** The well the pieces fall into. */
export const WELL = '#0b1220';
export const WELL_GRID = '#152238';

/** The title lettering, top row to bottom, and the rim and depth drawn around it. */
export const TITLE_FILL = ['#fffbe6', '#ffe58a', '#ffd04a', '#f4a933'] as const;
export const TITLE_RIM = '#2c5aa0';
export const TITLE_DEPTH = '#1c3768';

export interface BlockTones {
  readonly light: string;
  readonly base: string;
  readonly dark: string;
}

/**
 * Each piece is dressed in one of the creature types the console's own game is
 * about. The assignment deliberately differs from the familiar colours of other
 * falling-block games.
 */
export const BLOCK_TONES: Readonly<Record<Exclude<CellValue, null>, BlockTones>> = {
  /** Grass */
  I: { light: '#b4f0a0', base: '#5cc062', dark: '#2c7438' },
  /** Water */
  O: { light: '#a8d0ff', base: '#4f8fd8', dark: '#28508e' },
  /** Fire */
  T: { light: '#ffbc8a', base: '#e2603a', dark: '#8e2c16' },
  /** Electric */
  S: { light: '#fff2a8', base: '#f0c454', dark: '#9c7418' },
  /** Psychic */
  Z: { light: '#ffbadc', base: '#e070b0', dark: '#8c346a' },
  /** Ice */
  J: { light: '#c2f8ec', base: '#55d6be', dark: '#1e8270' },
  /** Ghost */
  L: { light: '#d2bcff', base: '#8a6ad0', dark: '#4a3486' },
  /** Stone: the game-over curtain */
  G: { light: '#c4c2b4', base: '#8c8a80', dark: '#4e4c46' },
};
