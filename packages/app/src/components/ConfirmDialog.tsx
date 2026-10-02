import type { ComponentChildren } from "preact";

interface ConfirmDialogProps {
  title: string;
  children?: ComponentChildren;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div class="dialog-backdrop" onClick={onCancel}>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 class="dialog-title">{title}</h2>
        {children && <div class="dialog-body">{children}</div>}
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" class="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
