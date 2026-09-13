import { parseColor, toHex, toRgba } from '../../core/color';

export interface ColorFieldProps {
  id: string;
  colorLabel: string;
  opacityLabel: string;
  /** Any CSS colour; rgb/rgba and hex are round-tripped exactly. */
  value: string;
  onChange(next: string): void;
}

export function ColorField({ id, colorLabel, opacityLabel, value, onChange }: ColorFieldProps) {
  const rgba = parseColor(value);
  const percent = Math.round(rgba.a * 100);

  return (
    <div className="color-row">
      <label className="sr-only" htmlFor={id}>
        {colorLabel}
      </label>
      <input
        id={id}
        type="color"
        value={toHex(rgba)}
        onChange={(event) => onChange(toRgba({ ...parseColor(event.target.value), a: rgba.a }))}
      />
      <label className="sr-only" htmlFor={`${id}-opacity`}>
        {opacityLabel}
      </label>
      <input
        id={`${id}-opacity`}
        type="range"
        min={5}
        max={100}
        step={5}
        value={percent}
        aria-valuetext={`${percent}%`}
        onChange={(event) => onChange(toRgba({ ...rgba, a: Number(event.target.value) / 100 }))}
      />
      <span className="row-value">{percent}%</span>
    </div>
  );
}
