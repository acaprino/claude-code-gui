import { memo } from "react";
import { Dialog } from "radix-ui";
import "./Modal.css";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default memo(function Modal({ title, children, onClose }: ModalProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className="modal"
          aria-describedby={undefined}
        >
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
