import {
  type RefObject,
  useEffect,
  useRef,
} from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isTopmostModal = (panel: HTMLElement) => {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"][aria-modal="true"]',
    ),
  );
  return dialogs.at(-1) === panel;
};

export function useOverlayBehavior({
  open,
  panelRef,
  initialFocusRef,
  preventClose,
  onRequestClose,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  preventClose: boolean;
  onRequestClose: () => void;
}) {
  const closeRef = useRef(onRequestClose);
  const preventCloseRef = useRef(preventClose);

  useEffect(() => {
    closeRef.current = onRequestClose;
    preventCloseRef.current = preventClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;
    document.body.style.overflow = "hidden";

    const focusInitialElement = () => {
      const preferred = initialFocusRef?.current;
      const firstFocusable =
        panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (preferred ?? firstFocusable ?? panel)?.focus();
    };
    focusInitialElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentPanel = panelRef.current;
      if (!currentPanel || !isTopmostModal(currentPanel)) return;

      if (event.key === "Escape") {
        if (!preventCloseRef.current) {
          event.preventDefault();
          closeRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        currentPanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hidden);

      if (!focusable.length) {
        event.preventDefault();
        currentPanel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [initialFocusRef, open, panelRef]);
}
