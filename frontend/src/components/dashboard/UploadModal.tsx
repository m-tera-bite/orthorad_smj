import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { useUpload, PendingUpload, JobPhase } from "../../context/UploadContext";

export type { ReportFile } from "../../context/UploadContext";
import type { ReportFile } from "../../context/UploadContext";

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

export default function UploadModal({ appointments, onClose, onUploaded, onFileDeleted }: Props) {
  const {
    job,
    startJob,
    addFilesToJob,
    removeFileFromJob,
    setNotifyPatient: setJobNotifyPatient,
    runJob,
    retryFailed,
    minimizeJob,
    reopenJob,
    dismissJob,
    canStartJobFor,
  } = useUpload();

  const [selectedId, setSelectedId] = useState<number | "">(appointments[0]?.id ?? "");
  const [existingFiles, setExistingFiles] = useState<ReportFile[]>(
    appointments[0]?.existingFiles ?? []
  );
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftNotifyPatient, setDraftNotifyPatient] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isJobForSelected = !!job && job.appointmentId === selectedId;

  // Reopening the modal (e.g. from the minimized bar) onto a job already in
  // progress should clear its minimized flag exactly once, on mount.
  useEffect(() => {
    if (job && job.appointmentId === selectedId) reopenJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const appt = appointments.find((a) => a.id === selectedId);
    setExistingFiles(appt?.existingFiles ?? []);
    if (!(job && job.appointmentId === selectedId)) {
      setDraftFiles([]);
      setDraftNotifyPatient(false);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, appointments]);

  // Auto-close (not minimize) once a job we're currently displaying finishes
  // successfully while the modal is open. Tracks the *transition* into
  // "success" rather than the static phase — otherwise reopening the modal
  // on a job that already finished while minimized (e.g. clicking the mini
  // bar right after it completes) would see phase "success" on the very
  // first render and close itself immediately.
  const prevPhaseRef = useRef<JobPhase | null>(null);
  useEffect(() => {
    const isCurrentJob = job && job.appointmentId === selectedId;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = isCurrentJob ? job.phase : null;
    if (isCurrentJob && prevPhase === "running" && job.phase === "success") {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.phase, selectedId]);

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

  const pendingFiles: PendingUpload[] = isJobForSelected
    ? job!.files
    : draftFiles.map((file) => ({ file, status: "pending", progress: 0 }));
  const notifyPatient = isJobForSelected ? job!.notifyPatient : draftNotifyPatient;
  const uploading = isJobForSelected && job!.phase === "running";
  const blockedByOtherJob = !isJobForSelected && !canStartJobFor(Number(selectedId) || -1);

  function handleNotifyChange(value: boolean) {
    if (isJobForSelected) setJobNotifyPatient(value);
    else setDraftNotifyPatient(value);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list);
    if (isJobForSelected) addFilesToJob(files);
    else setDraftFiles((prev) => [...prev, ...files]);
  }

  function removePending(index: number) {
    if (isJobForSelected) removeFileFromJob(index);
    else setDraftFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpload() {
    if (!selectedId || pendingFiles.length === 0) return;
    if (isJobForSelected) {
      if (hasErrors) retryFailed();
      else if (job!.phase !== "running") runJob();
    } else {
      if (blockedByOtherJob) return;
      const current = appointments.find((a) => a.id === selectedId);
      startJob(Number(selectedId), current?.patient_name ?? "la cita", draftFiles, draftNotifyPatient, onUploaded);
      runJob();
      setDraftFiles([]);
    }
  }

  function handleCloseOrMinimize() {
    if (isJobForSelected) {
      const hasUnresolved = job!.files.some((f) => f.status === "error" || f.status === "canceled");
      if (job!.phase === "running" || hasUnresolved) minimizeJob();
      else dismissJob();
    }
    onClose();
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
  const hasErrors = pendingFiles.some((p) => p.status === "error" || p.status === "canceled");
  const remainingCount = pendingFiles.filter((p) => p.status !== "done").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(92,51,23,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && handleCloseOrMinimize()}
    >
      <div className="bg-background-alt rounded-[10px] w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-montserrat font-bold text-[18px]">
            {isSingle ? "Gestionar Archivos" : "Subir Resultado"}
          </h2>
          <div className="flex items-center gap-3">
            {uploading && (
              <button
                onClick={() => { minimizeJob(); onClose(); }}
                title="Minimizar"
                className="text-alternative hover:text-white transition-colors text-lg leading-none"
              >
                ─
              </button>
            )}
            <button onClick={handleCloseOrMinimize} className="text-alternative hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
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
                      {p.status === "canceled" && (
                        <span className="text-text/50 font-quicksand text-xs flex-shrink-0">
                          Cancelado
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
                  onChange={(e) => handleNotifyChange(e.target.checked)}
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
          {blockedByOtherJob && job && (
            <p className="text-amber-600 text-sm font-quicksand">
              Ya hay una subida en curso para {job.appointmentLabel}. Espera a que termine (o
              cancélala desde la barra inferior) para iniciar esta.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCloseOrMinimize}
              className="flex-1 border border-primary text-primary py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
            >
              {!hasPending && hasExisting ? "Cerrar" : "Cancelar"}
            </button>
            {hasPending && (
              <button
                onClick={handleUpload}
                disabled={!selectedId || uploading || blockedByOtherJob}
                className="flex-1 bg-action-dark text-white py-2.5 rounded-[10px] font-quicksand font-semibold text-sm hover:bg-action-dark/80 transition-colors disabled:opacity-50"
              >
                {uploading
                  ? "Subiendo..."
                  : blockedByOtherJob
                  ? "Subida en curso…"
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
