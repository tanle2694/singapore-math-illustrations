import { el, clearChildren } from './core/dom';
import { categories, getCategory } from './core/registry';
import type { MathCategory } from './core/category';
import { createAppShell } from './components/AppShell';
import { renderHomePage } from './components/HomePage';

type Route =
  | { kind: 'home' }
  | { kind: 'category'; category: MathCategory }
  | { kind: 'not-found'; id: string };

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const match = /^\/category\/([^/?#]+)\/?$/.exec(path);
  if (!match) return { kind: 'home' };

  const id = decodeURIComponent(match[1]);
  const category = getCategory(id);
  return category ? { kind: 'category', category } : { kind: 'not-found', id };
}

function renderNotFound(id: string): HTMLElement {
  return el('div', { className: 'paper-card mx-auto max-w-xl p-10 text-center animate-rise-in' }, [
    el('p', { className: 'text-5xl' }, ['🔍']),
    el('h2', { className: 'mt-3 font-display text-2xl font-bold' }, [`Chưa có minh họa "${id}"`]),
    el('p', { className: 'mt-2 text-ink-soft' }, [
      'Có lẽ đường dẫn đã sai, hoặc mục này còn đang được vẽ. Quay lại trang chủ để xem những gì đã có nhé.',
    ]),
    el(
      'a',
      {
        className:
          'mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-paper shadow-[var(--shadow-pop)] transition hover:-translate-y-0.5',
        attrs: { href: '#/' },
      },
      ['← Về trang chủ'],
    ),
  ]);
}

let shell: ReturnType<typeof createAppShell> | null = null;
let teardownCurrent: (() => void) | null = null;

function render(): void {
  if (!shell) return;

  teardownCurrent?.();
  teardownCurrent = null;
  clearChildren(shell.content);

  const route = parseRoute(location.hash);

  if (route.kind === 'home') {
    shell.setActiveCategory(null);
    shell.content.append(renderHomePage(categories));
  } else if (route.kind === 'category') {
    shell.setActiveCategory(route.category);
    const host = el('div', { className: 'animate-rise-in' });
    shell.content.append(host);
    teardownCurrent = route.category.mount(host);
  } else {
    shell.setActiveCategory(null);
    shell.content.append(renderNotFound(route.id));
  }

  window.scrollTo(0, 0);
}

/** Programmatic navigation — pushes a hash, or re-renders if it's already current. */
export function navigate(path: string): void {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (location.hash === target) render();
  else location.hash = target;
}

/** Boots the hash router: builds the persistent shell once, then renders on every hash change. */
export function mountApp(root: HTMLElement): void {
  shell = createAppShell();
  root.append(shell.root);

  window.addEventListener('hashchange', render);
  render();
}
