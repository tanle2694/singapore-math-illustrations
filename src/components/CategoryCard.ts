import { el } from '../core/dom';
import type { MathCategory } from '../core/category';

const TILTS = [-2.4, 1.8, -1.3, 2.6, -2.0, 1.4];

/** A sticker-like tile for the home grid: rests at a slight tilt, straightens on hover,
 * and is themed entirely by the category's own accent colour. */
export function createCategoryCard(category: MathCategory, index: number): HTMLAnchorElement {
  const tilt = TILTS[index % TILTS.length];

  const card = el(
    'a',
    {
      className:
        'tilt-card paper-card group relative block overflow-hidden p-6 sm:p-7 ' +
        'hover:-translate-y-2 hover:shadow-[var(--shadow-pop)] hover:border-[var(--accent)] ' +
        'focus-visible:-translate-y-2 focus-visible:outline-none focus-visible:border-[var(--accent)] ' +
        'animate-rise-in',
      attrs: { href: `#/category/${category.id}` },
    },
    [
      el('span', { className: 'pin-tape left-9' }),
      el('div', { className: 'flex items-start justify-between gap-3' }, [
        el(
          'span',
          {
            className:
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ' +
              'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]/25',
            attrs: { 'aria-hidden': 'true' },
          },
          [category.icon],
        ),
        el(
          'span',
          {
            className:
              'rounded-full border-2 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider ' +
              'border-[var(--accent)] text-[var(--accent-deep)]',
          },
          [category.level],
        ),
      ]),

      el('h3', { className: 'mt-5 font-display text-xl font-extrabold leading-snug text-ink' }, [
        category.title,
      ]),
      el('p', { className: 'mt-2 text-[0.95rem] leading-relaxed text-ink-soft' }, [
        category.description,
      ]),

      el(
        'span',
        {
          className:
            'mt-6 inline-flex items-center gap-1.5 font-display text-sm font-bold text-[var(--accent-deep)]',
        },
        [
          'Khám phá ngay',
          el(
            'span',
            {
              className: 'inline-block transition-transform duration-300 group-hover:translate-x-1.5',
              attrs: { 'aria-hidden': 'true' },
            },
            ['→'],
          ),
        ],
      ),
    ],
  );

  card.style.setProperty('--accent', category.accent);
  card.style.setProperty('--tilt', `${tilt}deg`);
  card.style.animationDelay = `${index * 90}ms`;

  const tape = card.querySelector<HTMLElement>('.pin-tape');
  if (tape) tape.style.rotate = `${tilt > 0 ? -1 : 1.4}deg`;

  return card;
}
