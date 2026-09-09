import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../../api/client";

export interface ReportFile {
  id: number;
  original_name: string;
  url: string | null;
  uploaded_at: string;
  status: "pending" | "stored" | "failed";
}

export interface AppointmentOption {
  id: number;
  time?: string;
  patient_name: string;
  service_name: string;
  date_of_birth?: string | null;
  report_access_code?: string | null;
  existingFiles?: ReportFile[];
}

interface Props {
  appointments: AppointmentOption[];
  onClose: () => void;
  onUploaded: (appointmentId: number, uploadedAt: string, newFiles: ReportFile[]) => void;
  onFileDeleted?: (appointmentId: number, fileId: number) => void;
}

type PendingStatus = "pending" | "uploading" | "done" | "error";

interface PendingUpload {
  file: File;
  status: PendingStatus;
  progress: number; // 0-100
  error?: string;
  // Carried across retries so a retry reissues/reuses the same ReportFile
  // row (via the init endpoint's reuse path) instead of creating a new one
  // — and orphaning the previous attempt's row — every time.
  reportFileId?: number;
}

export default function UploadModal({ appointments, onClose, onUploaded, onFileDeleted }: Props) {
  const [selectedId, setSelectedId] = useState<number | "">(appointments[0]?.id ?? "");
  const [existingFiles, setExistingFiles] = useState<ReportFile[]>(
    appointments[0]?.existingFiles ?? []
  );
  const [pendingFiles, setPendingFiles] = useState<PendingUpload[]>([]);
  const [notifyPatient, setNotifyPatient] = useState(false);
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

  function updatePending(index: number, patch: Partial<PendingUpload>) {
    setPendingFiles((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  // Uploads a single pending file: asks Django for either a direct-to-GCS
  // signed URL or (local dev, no bucket configured) a small server URL,
  // then does the actual transfer, then confirms. Django's own request in
  // step 1 never carries file bytes, so it stays fast and small regardless
  // of how large the file itself is.
  async function uploadOne(index: number, pending: PendingUpload): Promise<ReportFile> {
    const contentType = pending.file.type || "application/octet-stream";
    const { data: initData } = await api.post(`/appointments/${selectedId}/report/upload/init/`, {
      filename: pending.file.name,
      content_type: contentType,
      report_file_id: pending.reportFileId ?? null,
    });
    updatePending(index, { reportFileId: initData.report_file_id });

    const onUploadProgress = (evt: { loaded: number; total?: number }) => {
      const progress = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
      updatePending(index, { progress });
    };

    if (initData.mode === "gcs") {
      // Plain axios, deliberately NOT the app's `api` client — this request
      // goes straight to storage.googleapis.com, a different origin, and
      // must not carry the app's baseURL prefix or its bearer-token
      // Authorization header.
      await axios.put(initData.upload_url, pending.file, {
        headers: initData.headers,
        onUploadProgress,
      });
      const { data } = await api.post(
        `/appointments/${selectedId}/report/upload/${initData.report_file_id}/finalize/`,
        { notify_patient: notifyPatient }
      );
      return data;
    }

    // Local-dev fallback: no GCS bucket configured, upload straight to Django.
    const form = new FormData();
    form.append("file", pending.file);
    form.append("notify_patient", String(notifyPatient));
    const { data } = await api.post(initData.upload_url, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
    return data;
  }

  async function handleUpload() {
    if (!selectedId || pendingFiles.length === 0) return;
    setUploading(true);
    setError(null);

    // Upload sequentially, not Promise.all: the backend treats the first
    // stored file for a report as the trigger for the "results ready"
    // notification email, and while it's protected against a race, there's
    // no reason to fire several finalize calls at once anyway.
    let lastUploadedAt: string | null = null;
    const newFiles: ReportFile[] = [];
    let anyFailed = false;

    for (let i = 0; i < pendingFiles.length; i++) {
      if (pendingFiles[i].status === "done") continue; // retry: skip already-succeeded files

      updatePending(i, { status: "uploading", progress: 0, error: undefined });
      try {
        const finalized = await uploadOne(i, pendingFiles[i]);
        updatePending(i, { status: "done", progress: 100 });
        lastUploadedAt = finalized.uploaded_at;
        newFiles.push(finalized);
      } catch {
        anyFailed = true;
        updatePending(i, { status: "error", error: "No se pudo subir." });
      }
    }

    setUploading(false);
    if (anyFailed) {
      setError("Algunos archivos no se pudieron subir. Reintenta para volver a intentarlo.");
      return;
    }
    if (lastUploadedAt) {
      onUploaded(Number(selectedId), lastUploadedAt, newFiles);
      onClose();
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setPendingFiles((prev) => [
      ...prev,
      ...Array.from(list).map((file) => ({ file, status: "pending" as PendingStatus, progress: 0 })),
    ]);
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
  const hasErrors = pendingFiles.some((p) => p.status === "error");
  const remainingCount = pendingFiles.filter((p) => p.status !== "done").length;

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

          {/* Patient access code */}
          {current?.report_access_code && (
            <div className="bg-background rounded-[10px] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-quicksand text-text/50 mb-0.5">Código de expediente del paciente</p>
                <p className="text-primary font-montserrat font-bold text-sm tracking-wide">
                  {current.report_access_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(current.report_access_code!)}
                className="text-xs text-[#3f6e7a] underline font-quicksand flex-shrink-0"
              >
                Copiar
              </button>
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
                    {f.status === "pending" && (
                      <span className="text-secondary font-quicksand text-xs flex-shrink-0">
                        Procesando…
                      </span>
                    )}
                    {f.status === "failed" && (
                      <span className="text-red-500 font-quicksand text-xs flex-shrink-0">
                        Error al subir
                      </span>
                    )}
                    {f.status === "stored" && f.url && (
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
                {pendingFiles.map((p, i) => (
                  <li key={i} className="bg-secondary/5 rounded-[8px] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-quicksand text-sm text-text truncate min-w-0">
                        {p.file.name}
                      </span>
                      {p.status === "pending" && (
                        <span className="text-text/40 font-quicksand text-xs flex-shrink-0">
                          {(p.file.size / 1024).toFixed(0)} KB
                        </span>
                      )}
                      {p.status === "uploading" && (
                        <span className="text-secondary font-quicksand text-xs flex-shrink-0">
                          {p.progress}%
                        </span>
                      )}
                      {p.status === "done" && (
                        <svg className="text-secondary flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {p.status === "error" && (
                        <span className="text-red-500 font-quicksand text-xs flex-shrink-0">
                          Error
                        </span>
                      )}
                      {p.status !== "uploading" && (
                        <button
                          onClick={() => removePending(i)}
                          className="text-text/40 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {p.status === "uploading" && (
                      <div className="mt-1.5 h-1 bg-secondary/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary transition-all duration-150"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasPending && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyPatient}
                  onChange={(e) => setNotifyPatient(e.target.checked)}
                  className="accent-action-dark"
                />
                <span className="text-text font-quicksand text-sm">
                  También notificar al paciente por correo
                </span>
              </label>
              {!current?.date_of_birth && (
                <p className="text-amber-600 text-xs font-quicksand pl-6">
                  ⚠ Este paciente no tiene fecha de nacimiento registrada — no podrá usar el
                  portal de resultados hasta agregarla.
                </p>
              )}
            </div>
          )}

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
                  : hasErrors
                  ? `Reintentar${remainingCount > 1 ? ` (${remainingCount})` : ""}`
                  : `Subir${pendingFiles.length > 1 ? ` (${pendingFiles.length})` : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
