import { el } from '../../core/dom';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'square';

export interface ButtonOptions {
  label: string;
  /** Leading glyph/emoji — purely decorative, kept out of the accessible name via aria-hidden. */
  icon?: string;
  variant?: ButtonVariant;
  onClick?: (ev: MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-display font-bold transition ' +
  'duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ' +
  'disabled:translate-y-0 disabled:shadow-none active:scale-[0.97]';

const VARIANTS: Record<ButtonVariant, string> = {
  solid:
    'rounded-2xl px-5 py-2.5 text-[0.95rem] text-white shadow-[0_10px_24px_-10px_var(--accent)] ' +
    'bg-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-10px_var(--accent)]',
  outline:
    'rounded-2xl border-2 px-5 py-2.5 text-[0.95rem] bg-card text-[var(--accent)] ' +
    'border-[var(--accent)] hover:-translate-y-0.5 hover:bg-[var(--accent-soft)]',
  ghost:
    'rounded-xl px-3.5 py-2 text-[0.9rem] text-ink-soft hover:text-ink hover:bg-card-line/50',
  square:
    'h-12 w-12 shrink-0 rounded-2xl text-2xl text-white shadow-[0_8px_18px_-8px_var(--accent)] ' +
    'bg-[var(--accent)] hover:-translate-y-0.5 active:translate-y-0',
};

/** A themed button factory — every variant reads its color from `var(--accent)`. */
export function createButton(opts: ButtonOptions): HTMLButtonElement {
  const variant = opts.variant ?? 'solid';

  return el(
    'button',
    {
      className: `${BASE} ${VARIANTS[variant]} ${opts.className ?? ''}`.trim(),
      attrs: {
        type: opts.type ?? 'button',
        disabled: opts.disabled,
        'aria-label': opts.ariaLabel,
      },
      on: { click: opts.onClick },
    },
    [
      opts.icon
        ? el('span', { attrs: { 'aria-hidden': 'true' }, className: 'leading-none' }, [opts.icon])
        : null,
      variant === 'square' ? null : opts.label,
    ],
  );
}
