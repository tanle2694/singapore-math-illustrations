import { el, svg } from '../core/dom';
import { createCategoryCard } from './CategoryCard';
import type { MathCategory } from '../core/category';

/** A loose, hand-drawn-feeling underline stroke (inline SVG so it stays crisp at any size). */
function squiggleUnderline(): SVGSVGElement {
  return svg(`
    <svg viewBox="0 0 220 18" preserveAspectRatio="none" fill="none" aria-hidden="true"
         class="pointer-events-none absolute inset-x-0 -bottom-1 block h-3 w-full text-[var(--color-coral)]">
      <path d="M4 12C42 2 86 2 112 9C140 16 182 16 216 6"
            stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `);
}

function renderHero(count: number): HTMLElement {
  const stamp = el(
    'p',
    {
      className:
        'inline-flex items-center gap-2 rounded-full border-2 border-dashed border-ink/25 bg-card ' +
        'px-4 py-1.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-ink-soft animate-rise-in',
    },
    ['✏️ Góc minh họa Singapore Math'],
  );

  const heading = el(
    'h1',
    {
      className:
        'mt-6 font-display text-4xl font-extrabold leading-[1.15] text-ink sm:text-6xl animate-rise-in',
    },
    [
      'Mỗi bài toán, ',
      el('span', { className: 'relative inline-block whitespace-nowrap text-[var(--color-coral)]' }, [
        'một câu chuyện',
        squiggleUnderline(),
      ]),
      ' để nhìn thấy tận mắt.',
    ],
  );

  const tagline = el(
    'p',
    { className: 'mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-ink-soft animate-rise-in' },
    [
      'Chọn một dạng toán bên dưới — mỗi minh họa là một "phòng thí nghiệm" nhỏ để vừa kéo-thả, ' +
        'vừa xem mô hình thanh và phép tính hiện ra, thay vì chỉ học thuộc công thức.',
    ],
  );

  const meta = el(
    'p',
    { className: 'mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft animate-rise-in' },
    [
      el('span', { className: 'flex h-2 w-2 animate-pulse rounded-full bg-[var(--color-meadow)]' }),
      `${count} minh họa đang chờ — và danh sách sẽ còn dài thêm`,
    ],
  );

  [stamp, heading, tagline, meta].forEach((node, i) => {
    node.style.animationDelay = `${i * 110}ms`;
  });

  return el('header', { className: 'mx-auto max-w-3xl pb-12 pt-8 text-center sm:pb-16 sm:pt-14' }, [
    stamp,
    heading,
    tagline,
    meta,
  ]);
}

function renderEmptyState(): HTMLElement {
  return el(
    'div',
    { className: 'paper-card mx-auto max-w-md p-10 text-center text-ink-soft' },
    [
      el('p', { className: 'text-4xl' }, ['🧺']),
      el('p', { className: 'mt-3 font-display text-lg font-bold text-ink' }, ['Chưa có minh họa nào']),
      el('p', { className: 'mt-1.5 text-sm' }, [
        'Thêm một thư mục trong src/categories/ — minh họa sẽ tự xuất hiện ở đây.',
      ]),
    ],
  );
}

export function renderHomePage(categories: MathCategory[]): HTMLElement {
  const grid =
    categories.length > 0
      ? el(
          'div',
          {
            className:
              'mx-auto grid max-w-6xl grid-cols-1 gap-7 px-1 pb-20 sm:grid-cols-2 lg:grid-cols-3',
          },
          categories.map((category, index) => createCategoryCard(category, index)),
        )
      : renderEmptyState();

  return el('section', { className: 'px-4 sm:px-6' }, [renderHero(categories.length), grid]);
}
