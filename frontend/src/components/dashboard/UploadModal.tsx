import { useEffect, useRef, useState } from "react";
import api from "../../api/client";

export interface ReportFile {
  id: number;
  original_name: string;
  url: string | null;
  uploaded_at: string;
}

export interface AppointmentOption {
  id: number;
  time?: string;
  patient_name: string;
  service_name: string;
  existingFiles?: ReportFile[];
}

interface Props {
  appointments: AppointmentOption[];
  onClose: () => void;
  onUploaded: (appointmentId: number, uploadedAt: string, newFiles: ReportFile[]) => void;
  onFileDeleted?: (appointmentId: number, fileId: number) => void;
}

export default function UploadModal({ appointments, onClose, onUploaded, onFileDeleted }: Props) {
  const [selectedId, setSelectedId] = useState<number | "">(appointments[0]?.id ?? "");
  const [existingFiles, setExistingFiles] = useState<ReportFile[]>(
    appointments[0]?.existingFiles ?? []
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const appt = appointments.find((a) => a.id === selectedId);
    setExistingFiles(appt?.existingFiles ?? []);
    setPendingFiles([]);
    setError(null);
  }, [selectedId, appointments]);

  async function handleDelete(fileId: number) {
    if (!selectedId) return;
    setDeletingId(fileId);
    setError(null);
    try {
      await api.delete(`/appointments/${selectedId}/report/files/${fileId}/`);
      setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
      onFileDeleted?.(Number(selectedId), fileId);
    } catch {
      setError("No se pudo eliminar el archivo.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpload() {
    if (!selectedId || pendingFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const f of pendingFiles) form.append("files", f);
      const { data } = await api.post(
        `/appointments/${selectedId}/report/upload/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      onUploaded(Number(selectedId), data.uploaded_at, data.files);
      onClose();
    } catch {
      setError("No se pudo subir el archivo. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setPendingFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  const isSingle = appointments.length === 1;
  const current = appointments.find((a) => a.id === selectedId);
  const hasExisting = existingFiles.length > 0;
  const hasPending = pendingFiles.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-montserrat font-bold text-[18px]">
            {isSingle ? "Gestionar Archivos" : "Subir Resultado"}
          </h2>
          <button onClick={onClose} className="text-alternative hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Appointment info */}
          {isSingle ? (
            <div className="bg-background rounded-[10px] px-4 py-3">
              <p className="text-xs font-quicksand text-text/50 mb-0.5">Cita</p>
              <p className="text-primary font-montserrat font-semibold text-sm">
                {current?.patient_name} — {current?.service_name}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-primary font-quicksand font-semibold text-sm mb-2">Paciente / Cita</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="w-full border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
              >
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.time ? `${a.time} — ` : ""}{a.patient_name} ({a.service_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Existing files */}
          {hasExisting && (
            <div>
              <p className="text-primary font-quicksand font-semibold text-sm mb-2">
                Archivos subidos ({existingFiles.length})
              </p>
              <ul className="space-y-2">
                {existingFiles.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 bg-background rounded-[10px] px-3 py-2.5">
                    <svg className="text-secondary flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="13 2 13 9 20 9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="flex-1 font-quicksand text-sm text-text truncate min-w-0">
                      {f.original_name}
                    </span>
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#3f6e7a] underline font-quicksand flex-shrink-0"
                      >
                        Ver
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                      className="text-text/30 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
                      title="Eliminar archivo"
                    >
                      {deletingId === f.id ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" opacity="0.25" />
                          <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Drop zone */}
          <div>
            <label className="block text-primary font-quicksand font-semibold text-sm mb-2">
              {hasExisting ? "Agregar más archivos" : "Archivo"}
            </label>
            <div
              className={`border-2 border-dashed rounded-[10px] px-4 py-6 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-secondary bg-secondary/10"
                  : "border-alternative bg-background hover:border-secondary"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.dcm"
                multiple
                onChange={(e) => addFiles(e.target.files)}
              />
              <svg className="mx-auto text-alternative mb-2" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-text font-quicksand text-sm">
                Arrastra o <span className="text-secondary underline">selecciona</span> archivos
              </p>
              <p className="text-text/50 font-quicksand text-xs mt-1">Imágenes, PDF o DICOM</p>
            </div>

            {/* Pending file queue */}
            {hasPending && (
              <ul className="mt-2 space-y-1">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 bg-secondary/5 rounded-[8px] px-3 py-2">
                    <span className="flex-1 font-quicksand text-sm text-text truncate min-w-0">{f.name}</span>
                    <span className="text-text/40 font-quicksand text-xs flex-shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removePending(i)}
                      className="text-text/40 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-red-600 text-sm font-quicksand">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-primary text-primary py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
            >
              {!hasPending && hasExisting ? "Cerrar" : "Cancelar"}
            </button>
            {hasPending && (
              <button
                onClick={handleUpload}
                disabled={!selectedId || uploading}
                className="flex-1 bg-action-dark text-white py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-action-dark/80 transition-colors disabled:opacity-50"
              >
                {uploading
                  ? "Subiendo..."
                  : `Subir${pendingFiles.length > 1 ? ` (${pendingFiles.length})` : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
