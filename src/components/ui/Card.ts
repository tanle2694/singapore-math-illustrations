import { el, type Children } from '../../core/dom';

export interface CardOptions {
  className?: string;
  /** Set false to skip the default padding when the content manages its own. */
  padded?: boolean;
}

/** A plain "index card" surface — the base paper texture used across the app. */
export function createCard(children: Children, opts: CardOptions = {}): HTMLDivElement {
  const padding = opts.padded === false ? '' : 'p-6 sm:p-7';
  return el('div', { className: `paper-card ${padding} ${opts.className ?? ''}`.trim() }, children);
}

export interface PanelOptions {
  title: string;
  icon?: string;
  className?: string;
  /** Extra nodes rendered to the right of the title (e.g. a badge or toggle). */
  trailing?: Children;
}

/** A titled section card — icon + heading row above free-form content. Used for the
 * timeline / calculation / results style blocks that recur across illustrations. */
export function createPanel(opts: PanelOptions, content: Children): HTMLElement {
  return createCard(
    [
      el('div', { className: 'mb-5 flex items-center justify-between gap-3' }, [
        el('h2', { className: 'flex items-center gap-2.5 font-display text-lg font-bold sm:text-xl' }, [
          opts.icon
            ? el('span', { className: 'text-2xl', attrs: { 'aria-hidden': 'true' } }, [opts.icon])
            : null,
          opts.title,
        ]),
        ...(opts.trailing ?? []),
      ]),
      ...content,
    ],
    { className: opts.className },
  );
}
