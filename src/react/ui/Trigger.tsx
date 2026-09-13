import type { RefObject } from 'react';
import type { WidgetLabels } from '../../core/types';
import { AccessIcon } from './AccessIcon';

export interface TriggerProps {
  labels: WidgetLabels;
  isOpen: boolean;
  panelId: string;
  /** Shows the dot badge: something differs from the defaults. */
  hasChanges: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle(viaKeyboard: boolean): void;
}

export function Trigger({
  labels,
  isOpen,
  panelId,
  hasChanges,
  buttonRef,
  onToggle,
}: TriggerProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="trigger"
      part="trigger"
      aria-label={labels.openPanel}
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={(event) => {
        // `detail === 0` means the click came from Enter or Space rather than a
        // pointer. Captured here because the modality cannot be recovered later,
        // and it decides whether the panel traps focus.
        onToggle(event.detail === 0);
      }}
    >
      <AccessIcon />
      {hasChanges && <span className="badge" aria-hidden="true" />}
    </button>
  );
}
