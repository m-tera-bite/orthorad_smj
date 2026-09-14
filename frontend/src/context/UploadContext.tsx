import { createContext, useContext, useRef, useState, ReactNode } from "react";
import axios from "axios";
import api from "../api/client";

export interface ReportFile {
  id: number;
  original_name: string;
  url: string | null;
  uploaded_at: string;
  status: "pending" | "stored" | "failed";
}

export type PendingStatus = "pending" | "uploading" | "done" | "error" | "canceled";

export interface PendingUpload {
  file: File;
  status: PendingStatus;
  progress: number; // 0-100
  error?: string;
  // Carried across retries so a retry reissues/reuses the same ReportFile
  // row (via the init endpoint's reuse path) instead of creating a new one
  // — and orphaning the previous attempt's row — every time.
  reportFileId?: number;
}

// "queued" = staged but waiting for the currently running job to finish —
// uploads are still processed one at a time (see runJob), so a second
// upload doesn't need to be blocked, only queued.
export type JobPhase = "queued" | "running" | "success" | "error";

export interface UploadJob {
  appointmentId: number;
  appointmentLabel: string;
  notifyPatient: boolean;
  files: PendingUpload[];
  phase: JobPhase;
  minimized: boolean;
}

type OnUploaded = (appointmentId: number, uploadedAt: string, newFiles: ReportFile[]) => void;

interface ToastEntry {
  id: number;
  message: string;
}

interface UploadContextType {
  jobs: UploadJob[];
  toasts: ToastEntry[];
  startJob: (
    appointmentId: number,
    appointmentLabel: string,
    files: File[],
    notifyPatient: boolean,
    onUploaded: OnUploaded
  ) => void;
  addFilesToJob: (appointmentId: number, files: File[]) => void;
  removeFileFromJob: (appointmentId: number, index: number) => void;
  setNotifyPatient: (appointmentId: number, value: boolean) => void;
  retryFailed: (appointmentId: number) => void;
  cancelJob: (appointmentId: number) => void;
  dismissJob: (appointmentId: number) => void;
  minimizeJob: (appointmentId: number) => void;
  reopenJob: (appointmentId: number) => void;
  dismissToast: (id: number) => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  // Mirrors `jobs` synchronously (state updates are deferred, this isn't) so
  // the async upload loop in runJob always reads the latest queue —
  // including files appended mid-run — instead of a stale closure.
  const jobsRef = useRef<UploadJob[]>([]);
  // Only one job actually transfers bytes at a time (see runJob/queue
  // advance below), so a single AbortController/cancel-target is enough —
  // no need for one per job.
  const abortControllerRef = useRef<AbortController | null>(null);
  const canceledAppointmentRef = useRef<number | null>(null);
  const onUploadedRefs = useRef<Map<number, OnUploaded>>(new Map());
  const toastIdRef = useRef(0);

  function setJobsBoth(updater: (prev: UploadJob[]) => UploadJob[]) {
    setJobs((prev) => {
      const next = updater(prev);
      jobsRef.current = next;
      return next;
    });
  }

  function updateFile(appointmentId: number, index: number, patch: Partial<PendingUpload>) {
    setJobsBoth((prev) =>
      prev.map((j) =>
        j.appointmentId === appointmentId
          ? { ...j, files: j.files.map((f, i) => (i === index ? { ...f, ...patch } : f)) }
          : j
      )
    );
  }

  function startJob(
    appointmentId: number,
    appointmentLabel: string,
    files: File[],
    notifyPatient: boolean,
    onUploaded: OnUploaded
  ) {
    onUploadedRefs.current.set(appointmentId, onUploaded);
    const alreadyRunning = jobsRef.current.some((j) => j.phase === "running");
    setJobsBoth((prev) => [
      // drop any stale finished/errored job left over for this appointment
      ...prev.filter((j) => j.appointmentId !== appointmentId),
      {
        appointmentId,
        appointmentLabel,
        notifyPatient,
        files: files.map((file) => ({ file, status: "pending" as PendingStatus, progress: 0 })),
        phase: alreadyRunning ? "queued" : "running",
        minimized: false,
      },
    ]);
    if (!alreadyRunning) runJob(appointmentId);
  }

  function addFilesToJob(appointmentId: number, files: File[]) {
    setJobsBoth((prev) =>
      prev.map((j) =>
        j.appointmentId === appointmentId
          ? {
              ...j,
              files: [
                ...j.files,
                ...files.map((file) => ({ file, status: "pending" as PendingStatus, progress: 0 })),
              ],
            }
          : j
      )
    );
  }

  function removeFileFromJob(appointmentId: number, index: number) {
    setJobsBoth((prev) =>
      prev.map((j) => (j.appointmentId === appointmentId ? { ...j, files: j.files.filter((_, i) => i !== index) } : j))
    );
  }

  function setNotifyPatient(appointmentId: number, value: boolean) {
    setJobsBoth((prev) =>
      prev.map((j) => (j.appointmentId === appointmentId ? { ...j, notifyPatient: value } : j))
    );
  }

  function minimizeJob(appointmentId: number) {
    setJobsBoth((prev) =>
      prev.map((j) => (j.appointmentId === appointmentId ? { ...j, minimized: true } : j))
    );
  }

  function reopenJob(appointmentId: number) {
    setJobsBoth((prev) =>
      prev.map((j) => (j.appointmentId === appointmentId ? { ...j, minimized: false } : j))
    );
  }

  function dismissJob(appointmentId: number) {
    onUploadedRefs.current.delete(appointmentId);
    setJobsBoth((prev) => prev.filter((j) => j.appointmentId !== appointmentId));
  }

  function pushToast(message: string) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Uploads a single pending file: asks Django for either a direct-to-GCS
  // signed URL or (local dev, no bucket configured) a small server URL,
  // then does the actual transfer, then confirms. Django's own request in
  // step 1 never carries file bytes, so it stays fast and small regardless
  // of how large the file itself is.
  async function uploadOne(
    appointmentId: number,
    notifyPatient: boolean,
    index: number,
    pending: PendingUpload,
    signal: AbortSignal
  ): Promise<ReportFile> {
    const contentType = pending.file.type || "application/octet-stream";
    const { data: initData } = await api.post(
      `/appointments/${appointmentId}/report/upload/init/`,
      {
        filename: pending.file.name,
        content_type: contentType,
        report_file_id: pending.reportFileId ?? null,
      },
      { signal }
    );
    updateFile(appointmentId, index, { reportFileId: initData.report_file_id });

    const onUploadProgress = (evt: { loaded: number; total?: number }) => {
      const progress = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
      updateFile(appointmentId, index, { progress });
    };

    if (initData.mode === "gcs") {
      // Plain axios, deliberately NOT the app's `api` client — this request
      // goes straight to storage.googleapis.com, a different origin, and
      // must not carry the app's baseURL prefix or its bearer-token
      // Authorization header.
      await axios.put(initData.upload_url, pending.file, {
        headers: initData.headers,
        onUploadProgress,
        signal,
      });
      const { data } = await api.post(
        `/appointments/${appointmentId}/report/upload/${initData.report_file_id}/finalize/`,
        { notify_patient: notifyPatient },
        { signal }
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
      signal,
    });
    return data;
  }

  async function runJob(appointmentId: number) {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let lastUploadedAt: string | null = null;
    const newFiles: ReportFile[] = [];
    let anyFailed = false;

    // Upload sequentially, not in parallel: the backend treats the first
    // stored file for a report as the trigger for the "results ready"
    // notification email, and there's no reason to fire several finalize
    // calls at once anyway. Read the queue fresh via jobsRef each pass so
    // files appended mid-run (addFilesToJob) are picked up.
    let i = 0;
    while (true) {
      const currentJob = jobsRef.current.find((j) => j.appointmentId === appointmentId);
      if (!currentJob || i >= currentJob.files.length) break;
      if (canceledAppointmentRef.current === appointmentId) break;
      const pending = currentJob.files[i];
      if (pending.status === "done") {
        i++;
        continue;
      }

      updateFile(appointmentId, i, { status: "uploading", progress: 0, error: undefined });
      try {
        const finalized = await uploadOne(
          appointmentId,
          currentJob.notifyPatient,
          i,
          pending,
          controller.signal
        );
        updateFile(appointmentId, i, { status: "done", progress: 100 });
        lastUploadedAt = finalized.uploaded_at;
        newFiles.push(finalized);
      } catch (err) {
        if (canceledAppointmentRef.current === appointmentId || axios.isCancel(err)) {
          updateFile(appointmentId, i, { status: "canceled" });
        } else {
          anyFailed = true;
          updateFile(appointmentId, i, { status: "error", error: "No se pudo subir." });
        }
      }
      i++;
    }

    abortControllerRef.current = null;
    const wasCanceled = canceledAppointmentRef.current === appointmentId;
    if (wasCanceled) canceledAppointmentRef.current = null;

    setJobsBoth((prev) =>
      prev.map((j) =>
        j.appointmentId === appointmentId ? { ...j, phase: wasCanceled || anyFailed ? "error" : "success" } : j
      )
    );

    if (!wasCanceled && !anyFailed && lastUploadedAt) {
      const finished = jobsRef.current.find((j) => j.appointmentId === appointmentId);
      if (finished) {
        onUploadedRefs.current.get(appointmentId)?.(appointmentId, lastUploadedAt, newFiles);
        if (finished.minimized) {
          pushToast(`Resultados de ${finished.appointmentLabel} subidos correctamente.`);
        }
      }
    }

    startNextQueuedJob();
  }

  function startNextQueuedJob() {
    const next = jobsRef.current.find((j) => j.phase === "queued");
    if (!next) return;
    setJobsBoth((prev) =>
      prev.map((j) => (j.appointmentId === next.appointmentId ? { ...j, phase: "running" } : j))
    );
    runJob(next.appointmentId);
  }

  function retryFailed(appointmentId: number) {
    const alreadyRunning = jobsRef.current.some((j) => j.phase === "running");
    setJobsBoth((prev) =>
      prev.map((j) =>
        j.appointmentId === appointmentId
          ? {
              ...j,
              phase: alreadyRunning ? "queued" : "running",
              files: j.files.map((f) =>
                f.status === "error" || f.status === "canceled"
                  ? { ...f, status: "pending" as PendingStatus, progress: 0, error: undefined }
                  : f
              ),
            }
          : j
      )
    );
    if (!alreadyRunning) runJob(appointmentId);
  }

  function cancelJob(appointmentId: number) {
    const target = jobsRef.current.find((j) => j.appointmentId === appointmentId);
    if (!target) return;
    if (target.phase === "running") {
      canceledAppointmentRef.current = appointmentId;
      abortControllerRef.current?.abort();
    }
    setJobsBoth((prev) =>
      prev.map((j) =>
        j.appointmentId === appointmentId
          ? {
              ...j,
              phase: "error",
              files: j.files.map((f) =>
                f.status === "uploading" || f.status === "pending" ? { ...f, status: "canceled" as PendingStatus } : f
              ),
            }
          : j
      )
    );
    // A queued job never started, so canceling it doesn't advance/interrupt
    // anything — the running job (if any) is untouched.
  }

  return (
    <UploadContext.Provider
      value={{
        jobs,
        toasts,
        startJob,
        addFilesToJob,
        removeFileFromJob,
        setNotifyPatient,
        retryFailed,
        cancelJob,
        dismissJob,
        minimizeJob,
        reopenJob,
        dismissToast,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
}
