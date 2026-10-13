/** The parts of a host element the game changes while it is mounted. */
export interface BorrowedElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  readonly classList: Pick<DOMTokenList, 'add' | 'remove' | 'contains'>;
  readonly style: Pick<
    CSSStyleDeclaration,
    'getPropertyValue' | 'getPropertyPriority' | 'setProperty' | 'removeProperty'
  >;
}

export interface Borrowing {
  readonly className: string;
  readonly attributes: Readonly<Record<string, string>>;
  /**
   * Inline styles by CSS property name. Use longhands only: putting back a
   * shorthand the host never set would also wipe the longhands it did set.
   */
  readonly style: Readonly<Record<string, string>>;
}

/**
 * Applies a class, attributes and inline styles to a host's element, and
 * returns a function that puts back exactly what was there before, so an
 * unmounted game leaves no focusable, labelled, dark box on the host page.
 */
export function borrowElement(element: BorrowedElement, borrowing: Borrowing): () => void {
  const hadClassAttribute = element.getAttribute('class') !== null;
  const hadClass = element.classList.contains(borrowing.className);
  const attributes = Object.keys(borrowing.attributes).map((name) => ({
    name,
    value: element.getAttribute(name),
  }));
  const styles = Object.keys(borrowing.style).map((name) => ({
    name,
    value: element.style.getPropertyValue(name),
    priority: element.style.getPropertyPriority(name),
  }));

  element.classList.add(borrowing.className);
  for (const [name, value] of Object.entries(borrowing.attributes)) {
    element.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(borrowing.style)) {
    element.style.setProperty(name, value);
  }

  return () => {
    if (!hadClass) {
      element.classList.remove(borrowing.className);
    }
    if (!hadClassAttribute && element.getAttribute('class') === '') {
      element.removeAttribute('class');
    }
    for (const { name, value } of attributes) {
      if (value === null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
    }
    for (const { name, value, priority } of styles) {
      if (value === '') {
        element.style.removeProperty(name);
      } else {
        element.style.setProperty(name, value, priority);
      }
    }
  };
}
