import { X } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useId,
  useRef,
} from "react";
import { useOverlayBehavior } from "./useOverlayBehavior";

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  closeOnBackdrop?: boolean;
  preventClose?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  panelClassName?: string;
  showClose?: boolean;
  closeLabel?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  preventClose = false,
  initialFocusRef,
  className = "",
  panelClassName = "",
  showClose = true,
  closeLabel = "Đóng hộp thoại",
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const requestClose = () => {
    if (!preventClose) onOpenChange(false);
  };

  useOverlayBehavior({
    open,
    panelRef,
    initialFocusRef,
    preventClose,
    onRequestClose: requestClose,
  });

  if (!open) return null;

  return (
    <div
      className={`sgdg-overlay sgdg-dialog ${className}`.trim()}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          closeOnBackdrop &&
          !preventClose
        ) {
          onOpenChange(false);
        }
      }}
    >
      <section
        ref={panelRef}
        className={`sgdg-dialog__panel sgdg-dialog__panel--${size} ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="sgdg-dialog__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          {showClose && (
            <button
              className="sgdg-overlay__close"
              type="button"
              aria-label={closeLabel}
              disabled={preventClose}
              onClick={requestClose}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="sgdg-dialog__body">{children}</div>
        {footer && <footer className="sgdg-dialog__footer">{footer}</footer>}
      </section>
    </div>
  );
}
