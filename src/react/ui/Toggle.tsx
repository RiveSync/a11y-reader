export interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange(next: boolean): void;
}

/**
 * A native checkbox with the visual switch drawn behind it.
 *
 * The input keeps its real size and sits on top at zero opacity, so the control
 * is genuinely a checkbox to keyboards and screen readers — role, state and
 * label all come for free rather than being re-implemented with ARIA.
 */
export function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <div className="row">
      <div className="row-head">
        <label className="row-label" htmlFor={id}>
          {label}
        </label>
        <span className="switch">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="track" />
          <span className="knob" />
        </span>
      </div>
    </div>
  );
}
