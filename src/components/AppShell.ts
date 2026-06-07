import { el } from '../core/dom';
import type { MathCategory } from '../core/category';

export interface AppShellHandle {
  root: HTMLElement;
  /** Where the router mounts the home grid or the active category's view. */
  content: HTMLElement;
  /** Re-themes the shell (accent strip, header badge, back link) for the active route. */
  setActiveCategory(category: MathCategory | null): void;
}

const DEFAULT_ACCENT = 'var(--color-indigo)';

/**
 * The persistent chrome — built once by the router and re-themed on every
 * navigation via `setActiveCategory`. Keeps categories focused on their own
 * math, not on headers/footers/back-links.
 */
export function createAppShell(): AppShellHandle {
  const brand = el(
    'a',
    {
      className: 'group flex items-center gap-3',
      attrs: { href: '#/', 'aria-label': 'Về trang chủ Vở Toán Singapore' },
    },
    [
      el(
        'span',
        {
          className:
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-xl ' +
            'text-paper shadow-md transition-transform duration-300 group-hover:-rotate-[12deg]',
          attrs: { 'aria-hidden': 'true' },
        },
        ['📐'],
      ),
      el('span', { className: 'flex flex-col leading-none' }, [
        el('span', { className: 'font-display text-lg font-extrabold tracking-tight text-ink' }, [
          'Vở Toán Singapore',
        ]),
        el(
          'span',
          { className: 'mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-soft' },
          ['Minh họa trực quan · Tư duy toán học'],
        ),
      ]),
    ],
  );

  const activeBadge = el(
    'span',
    {
      className:
        'hidden items-center gap-2 rounded-2xl border-2 px-3.5 py-1.5 font-display text-sm ' +
        'font-bold sm:inline-flex border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]',
    },
    [],
  );

  const backLink = el(
    'a',
    {
      className:
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 bg-card px-4 py-2 ' +
        'font-display text-sm font-bold text-ink-soft transition-all duration-200 ' +
        'hover:-translate-x-0.5 hover:border-[var(--accent)] hover:text-[var(--accent-deep)]',
      attrs: { href: '#/' },
    },
    [el('span', { attrs: { 'aria-hidden': 'true' } }, ['←']), 'Tất cả minh họa'],
  );
  backLink.classList.add('invisible');

  const accentBar = el('div', {
    className: 'h-[5px] w-full bg-[var(--accent)] transition-[background-color] duration-500 ease-out',
  });

  const header = el(
    'header',
    { className: 'sticky top-0 z-30 border-b border-ink/10 bg-paper/85 backdrop-blur-md' },
    [
      el('div', { className: 'mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6' }, [
        brand,
        el('div', { className: 'flex items-center gap-3' }, [activeBadge, backLink]),
      ]),
      accentBar,
    ],
  );

  const content = el('main', { className: 'mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-9 sm:px-6 sm:pt-14' });

  const footer = el(
    'footer',
    { className: 'border-t border-ink/10 px-4 py-9 text-center text-sm text-ink-soft' },
    [
      el('p', {}, [
        '✏️ Học toán bằng cách ',
        el('span', { className: 'font-bold text-ink' }, ['nhìn thấy']),
        ' và ',
        el('span', { className: 'font-bold text-ink' }, ['chạm vào']),
        ' — không chỉ ghi nhớ công thức.',
      ]),
    ],
  );

  const root = el(
    'div',
    { className: 'relative z-10 flex min-h-screen flex-col' },
    [header, content, footer],
  );

  function setActiveCategory(category: MathCategory | null): void {
    if (category) {
      root.style.setProperty('--accent', category.accent);
      activeBadge.replaceChildren(
        el('span', { attrs: { 'aria-hidden': 'true' } }, [category.icon]),
        category.title,
      );
      activeBadge.classList.remove('hidden');
      backLink.classList.remove('invisible');
    } else {
      root.style.setProperty('--accent', DEFAULT_ACCENT);
      activeBadge.classList.add('hidden');
      backLink.classList.add('invisible');
    }
  }

  return { root, content, setActiveCategory };
}
