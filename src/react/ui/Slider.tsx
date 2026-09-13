export interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Human-readable value, used for both the visible text and aria-valuetext. */
  format(value: number): string;
  decreaseLabel: string;
  increaseLabel: string;
  onChange(next: number): void;
}

/** Avoids 1.3000000000000003 arriving from repeated stepper clicks. */
function snap(value: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(value.toFixed(decimals));
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  decreaseLabel,
  increaseLabel,
  onChange,
}: SliderProps) {
  const text = format(value);
  const set = (next: number) => onChange(snap(Math.min(max, Math.max(min, next)), step));

  return (
    <div className="row">
      <div className="row-head">
        <label className="row-label" htmlFor={id}>
          {label}
        </label>
        <span className="row-value">{text}</span>
      </div>
      <div className="slider-row">
        {/*
          Steppers are not decoration: dragging a range input to an exact value
          is hard with a tremor or a trackpad, and this widget's users are
          disproportionately likely to need the discrete option.
        */}
        <button
          type="button"
          className="stepper"
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`${decreaseLabel} ${label}`}
        >
          &minus;
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          // Without this a screen reader announces "1.4", not "140 percent".
          aria-valuetext={text}
          onChange={(event) => set(Number(event.target.value))}
        />
        <button
          type="button"
          className="stepper"
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`${increaseLabel} ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
