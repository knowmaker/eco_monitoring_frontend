import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export default function Dialog({ title, description, onClose, children }) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose?.();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content className="modal-card">
          <DialogPrimitive.Close asChild>
            <button className="modal-close icon-btn" type="button" aria-label="Закрыть">
              <X size={17} aria-hidden="true" />
            </button>
          </DialogPrimitive.Close>

          <DialogPrimitive.Title asChild>
            <h2>{title}</h2>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="modal-description-visually-hidden">
            {description}
          </DialogPrimitive.Description>

          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
