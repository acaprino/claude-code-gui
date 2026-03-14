import { useState, useEffect, useRef, useCallback, useId } from "react";
import "./Modal.css";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default function Modal({ title, children, onClose }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);

  // M4: Stabilize onClose with ref so the Escape key effect doesn't re-register
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const startClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
  }, [closing]);

  const handleAnimationEnd = useCallback(() => {
    if (closing) onCloseRef.current();
  }, [closing]);

  // Store previous focus, auto-focus first focusable, restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 0);
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Focus trap + Escape handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        startClose();
        return;
      }

      // Focus trap on Tab
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    // Capture phase so it intercepts before NewTabPage's handler
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [startClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) startClose();
    },
    [startClose],
  );

  return (
    <div
      className={`modal-backdrop ${closing ? "closing" : ""}`}
      ref={backdropRef}
      onClick={handleBackdropClick}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={`modal ${closing ? "closing" : ""}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 className="modal-title" id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
