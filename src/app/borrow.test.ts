import { describe, expect, it } from 'vitest';
import { borrowElement, type BorrowedElement, type Borrowing } from './borrow';

/** Just enough of an element: attributes, a class list and inline styles with priorities. */
function fakeElement(attributes: Record<string, string> = {}, style: Record<string, [string, string]> = {}) {
  const attrs = new Map(Object.entries(attributes));
  const styles = new Map(Object.entries(style));
  const classes = () => (attrs.get('class') ?? '').split(' ').filter(Boolean);
  const element: BorrowedElement = {
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => void attrs.set(name, value),
    removeAttribute: (name) => void attrs.delete(name),
    classList: {
      add: (name) => void attrs.set('class', [...new Set([...classes(), name])].join(' ')),
      remove: (name) =>
        void attrs.set(
          'class',
          classes()
            .filter((c) => c !== name)
            .join(' '),
        ),
      contains: (name) => classes().includes(name),
    },
    style: {
      getPropertyValue: (name) => styles.get(name)?.[0] ?? '',
      getPropertyPriority: (name) => styles.get(name)?.[1] ?? '',
      setProperty: (name, value, priority = '') => void styles.set(name, [value ?? '', priority ?? '']),
      removeProperty: (name) => {
        const old = styles.get(name)?.[0] ?? '';
        styles.delete(name);
        return old;
      },
    },
  };
  return { element, attrs, styles };
}

const GAME: Borrowing = {
  className: 'pallet-blocks',
  attributes: { tabindex: '0', role: 'application', 'aria-label': 'Pallet Blocks' },
  style: { display: 'flex', 'outline-style': 'none', 'background-color': '#05080f' },
};

describe('borrowElement', () => {
  it('makes the element the game while mounted', () => {
    const { element, attrs, styles } = fakeElement();
    borrowElement(element, GAME);
    expect(attrs.get('class')).toBe('pallet-blocks');
    expect(attrs.get('tabindex')).toBe('0');
    expect(attrs.get('role')).toBe('application');
    expect(styles.get('outline-style')).toEqual(['none', '']);
  });

  it('leaves a plain element as plain as it found it, so it is no longer focusable or labelled', () => {
    const { element, attrs, styles } = fakeElement({ id: 'console' });
    borrowElement(element, GAME)();
    expect(Object.fromEntries(attrs)).toEqual({ id: 'console' });
    expect(styles.size).toBe(0);
  });

  it("puts back the host's own class, attributes and styles, priorities and all", () => {
    const { element, attrs, styles } = fakeElement(
      { class: 'screen', tabindex: '-1', role: 'region' },
      { display: ['grid', ''], 'background-color': ['red', 'important'] },
    );
    borrowElement(element, GAME)();
    expect(Object.fromEntries(attrs)).toEqual({ class: 'screen', tabindex: '-1', role: 'region' });
    expect(Object.fromEntries(styles)).toEqual({
      display: ['grid', ''],
      'background-color': ['red', 'important'],
    });
  });

  it('keeps a game class the host had put there itself', () => {
    const { element, attrs } = fakeElement({ class: 'pallet-blocks' });
    borrowElement(element, GAME)();
    expect(attrs.get('class')).toBe('pallet-blocks');
  });
});
