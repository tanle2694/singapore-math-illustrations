/**
 * Tiny DOM-construction convention shared by every component & category.
 * No framework — just ergonomic factories around `document.createElement`.
 */

type Child = Node | string | number | null | undefined | false;
export type Children = Child[];

interface ElOptions extends Partial<Omit<HTMLElement, 'style' | 'children' | 'className'>> {
  className?: string;
  attrs?: Record<string, string | number | boolean | undefined | null>;
  style?: Partial<CSSStyleDeclaration>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[K]) => void }>;
}

/** Create an element, set its props/attrs/listeners, and append children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
  children: Children = [],
): HTMLElementTagNameMap[K] {
  const { className, attrs, style, on, ...rest } = options;
  const node = document.createElement(tag);

  if (className) node.className = className;
  Object.assign(node, rest);
  if (style) Object.assign(node.style, style);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  if (on) {
    for (const [type, handler] of Object.entries(on)) {
      if (handler) node.addEventListener(type, handler as EventListener);
    }
  }

  append(node, children);
  return node;
}

/** Append a mixed list of nodes/strings/falsy-skips to a parent. */
export function append(parent: Element | DocumentFragment, children: Children): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Remove every child node — used when re-rendering a container in place. */
export function clearChildren(node: Element): void {
  node.replaceChildren();
}

/** Parse a literal `<svg>…</svg>` string into a live element (for inline doodles/icons). */
export function svg(markup: string): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup.trim();
  const node = wrap.firstElementChild;
  if (!(node instanceof SVGSVGElement)) {
    throw new Error('svg(): markup must contain a single root <svg> element');
  }
  return node;
}

/** Merge several cleanup callbacks (timers, RAFs, listeners…) into one. */
export function combineCleanup(...fns: Array<(() => void) | undefined | void>): () => void {
  return () => {
    for (const fn of fns) fn?.();
  };
}
