import type { LockResult } from '../core/game';

const LINE_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'] as const;

/**
 * The words the side panel shows for a lock worth talking about, one entry per
 * line of the panel. Empty when there is nothing to say.
 */
export function describeLock(lock: LockResult): string[] {
  const lines: string[] = [];
  if (lock.spin !== 'none') {
    lines.push(lock.spin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN');
    if (lock.lines > 0) {
      lines.push(LINE_NAMES[Math.min(lock.lines, 4)]!);
    }
  } else if (lock.lines > 0) {
    lines.push(LINE_NAMES[Math.min(lock.lines, 4)]!);
  }
  if (lock.backToBack) {
    lines.push('BACK-TO-BACK');
  }
  if (lock.combo > 0) {
    lines.push(`COMBO ${lock.combo}`);
  }
  if (lock.perfectClear) {
    lines.push('ALL CLEAR');
  }
  return lines;
}
