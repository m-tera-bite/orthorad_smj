import { ReactNode, useState } from "react";

interface Props {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * Confirmation modal for destructive actions. Runs `onConfirm` (awaiting it
 * if async) and shows any failure inline so the user can retry or cancel.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError("No se pudo completar la acción. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-md mx-4 overflow-hidden shadow-xl">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-montserrat font-bold text-[17px]">{title}</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/70 hover:text-white transition-colors text-xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-text font-quicksand text-sm leading-relaxed">{message}</div>
          <p className="text-text/60 font-quicksand text-[12px]">
            Esta acción quedará registrada en el historial de acciones.
          </p>

          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-primary text-primary py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Eliminando..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
