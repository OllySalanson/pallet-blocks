/**
 * How many device pixels each game pixel gets.
 *
 * A whole number whenever the screen fits at least once, so every game pixel
 * is the same size and the art stays crisp; the count is taken in *device*
 * pixels, so a display at 125% or 150% still gets whole-pixel scaling. Only
 * when there is not room for the game at 1x does it shrink by a fraction.
 */
export function fitScale(
  availableWidth: number,
  availableHeight: number,
  width: number,
  height: number,
): number {
  const fit = Math.min(availableWidth / width, availableHeight / height);
  if (!Number.isFinite(fit) || fit <= 0) {
    return 1;
  }
  return fit >= 1 ? Math.floor(fit) : fit;
}
