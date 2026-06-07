import { el } from '../../core/dom';

export interface BubbleHandle {
  root: HTMLElement;
  /** Replace the message (accepts simple inline HTML) and replay the pop-in animation. */
  setMessage(html: string): void;
}

/** The friendly "teaching bubble" that narrates each step — accent-tinted, dashed border. */
export function createBubble(initial: string): BubbleHandle {
  const text = el('p', { className: 'font-medium leading-relaxed' });
  text.innerHTML = initial;

  const root = el(
    'div',
    {
      className:
        'relative mx-auto flex max-w-2xl items-center justify-center gap-2.5 rounded-3xl border-2 ' +
        'border-dashed px-6 py-4 text-center shadow-[var(--shadow-card)] ' +
        'border-[var(--accent)] bg-[var(--accent-soft)] text-ink',
    },
    [
      el('span', { className: 'shrink-0 text-xl', attrs: { 'aria-hidden': 'true' } }, ['💬']),
      text,
    ],
  );

  return {
    root,
    setMessage(html) {
      root.classList.remove('animate-pop-in');
      void root.offsetWidth; // force reflow so the animation can replay
      text.innerHTML = html;
      root.classList.add('animate-pop-in');
    },
  };
}
