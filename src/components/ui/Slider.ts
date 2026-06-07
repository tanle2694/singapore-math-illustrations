import { el } from '../../core/dom';

export interface SliderOptions {
  min: number;
  max: number;
  value: number;
  step?: number;
  ariaLabel: string;
  onInput: (value: number) => void;
  className?: string;
}

export interface SliderHandle {
  root: HTMLInputElement;
  setValue(value: number): void;
}

/** A bare themed range input — its thumb/track read `var(--accent)` (see `.ui-slider` in global.css). */
export function createSlider(opts: SliderOptions): SliderHandle {
  const input = el('input', {
    className: `ui-slider w-full ${opts.className ?? ''}`.trim(),
    attrs: {
      type: 'range',
      min: opts.min,
      max: opts.max,
      step: opts.step ?? 1,
      value: opts.value,
      'aria-label': opts.ariaLabel,
    },
    on: { input: () => opts.onInput(Number(input.value)) },
  }) as HTMLInputElement;

  return {
    root: input,
    setValue(value) {
      input.value = String(value);
    },
  };
}
