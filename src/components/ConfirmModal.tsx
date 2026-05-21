import { Modal } from "./Modal";

export function ConfirmModal({
  open,
  title = "Delete?",
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={400}>
      <p className="text-secondary mb-0" style={{ color: "var(--text-muted)" }}>{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>
          <i className="bi bi-trash me-1" /> {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
