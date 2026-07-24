import { X } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useId,
  useRef,
} from "react";
import { useOverlayBehavior } from "./useOverlayBehavior";

export type DrawerSide = "right" | "left";
export type DrawerMobilePresentation = "bottom-sheet" | "full-screen";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  mobilePresentation?: DrawerMobilePresentation;
  preventClose?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  panelClassName?: string;
  closeLabel?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  mobilePresentation = "bottom-sheet",
  preventClose = false,
  closeOnBackdrop = true,
  initialFocusRef,
  className = "",
  panelClassName = "",
  closeLabel = "Đóng ngăn nội dung",
}: DrawerProps) {
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
      className={`sgdg-overlay sgdg-drawer ${className}`.trim()}
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
      <aside
        ref={panelRef}
        className={[
          "sgdg-drawer__panel",
          `sgdg-drawer__panel--${side}`,
          `sgdg-drawer__panel--mobile-${mobilePresentation}`,
          panelClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="sgdg-drawer__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            className="sgdg-overlay__close"
            type="button"
            aria-label={closeLabel}
            disabled={preventClose}
            onClick={requestClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="sgdg-drawer__body">{children}</div>
        {footer && <footer className="sgdg-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
}
