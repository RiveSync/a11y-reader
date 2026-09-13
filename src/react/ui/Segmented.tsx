import { useRef } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  /** Explicit id: deriving one from the label text breaks for any label
      containing a space, and labels are host-overridable for i18n. */
  id: string;
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange(next: T): void;
}

/**
 * A radiogroup with roving tabindex.
 *
 * Only the selected option is tabbable, and the arrow keys move between
 * options — the pattern a screen reader user expects from a radio group. A row
 * of independently tabbable buttons would be three extra tab stops and would
 * not announce the group or the selection.
 */
export function Segmented<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;

    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + delta + options.length) % options.length]!;
    onChange(next.value);

    // Follow-focus, so the newly selected option is where Tab resumes from.
    const buttons = ref.current?.querySelectorAll('button');
    buttons?.[options.indexOf(next)]?.focus();
  };

  return (
    <div className="row">
      <div className="row-head">
        <span className="row-label" id={`${id}-label`}>
          {label}
        </span>
      </div>
      <div className="seg" role="radiogroup" aria-labelledby={`${id}-label`} ref={ref}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            tabIndex={option.value === value ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
