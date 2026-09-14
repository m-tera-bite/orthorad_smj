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

export type JobPhase = "idle" | "running" | "success" | "error";

export interface UploadJob {
  appointmentId: number;
  appointmentLabel: string;
  notifyPatient: boolean;
  files: PendingUpload[];
  phase: JobPhase;
  minimized: boolean;
}

type OnUploaded = (appointmentId: number, uploadedAt: string, newFiles: ReportFile[]) => void;

interface UploadContextType {
  job: UploadJob | null;
  toast: { message: string } | null;
  startJob: (
    appointmentId: number,
    appointmentLabel: string,
    files: File[],
    notifyPatient: boolean,
    onUploaded: OnUploaded
  ) => void;
  addFilesToJob: (files: File[]) => void;
  removeFileFromJob: (index: number) => void;
  setNotifyPatient: (value: boolean) => void;
  runJob: () => void;
  retryFailed: () => void;
  cancelJob: () => void;
  dismissJob: () => void;
  minimizeJob: () => void;
  reopenJob: () => void;
  canStartJobFor: (appointmentId: number) => boolean;
  dismissToast: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<UploadJob | null>(null);
  const [toast, setToast] = useState<{ message: string } | null>(null);

  // Mirrors `job` synchronously (state updates are deferred, this isn't) so
  // the async upload loop in runJob always reads the latest queue/appointment
  // — including files appended mid-run — instead of a stale closure.
  const jobRef = useRef<UploadJob | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const canceledRef = useRef(false);
  const onUploadedRef = useRef<OnUploaded | null>(null);

  function setJobBoth(updater: (prev: UploadJob | null) => UploadJob | null) {
    setJob((prev) => {
      const next = updater(prev);
      jobRef.current = next;
      return next;
    });
  }

  function updateFile(index: number, patch: Partial<PendingUpload>) {
    setJobBoth((prev) =>
      prev && {
        ...prev,
        files: prev.files.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      }
    );
  }

  function canStartJobFor(appointmentId: number) {
    return !(job && job.phase === "running" && job.appointmentId !== appointmentId);
  }

  function startJob(
    appointmentId: number,
    appointmentLabel: string,
    files: File[],
    notifyPatient: boolean,
    onUploaded: OnUploaded
  ) {
    if (!canStartJobFor(appointmentId)) return;
    onUploadedRef.current = onUploaded;
    setJobBoth(() => ({
      appointmentId,
      appointmentLabel,
      notifyPatient,
      files: files.map((file) => ({ file, status: "pending" as PendingStatus, progress: 0 })),
      phase: "idle",
      minimized: false,
    }));
  }

  function addFilesToJob(files: File[]) {
    setJobBoth(
      (prev) =>
        prev && {
          ...prev,
          files: [
            ...prev.files,
            ...files.map((file) => ({ file, status: "pending" as PendingStatus, progress: 0 })),
          ],
        }
    );
  }

  function removeFileFromJob(index: number) {
    setJobBoth((prev) => prev && { ...prev, files: prev.files.filter((_, i) => i !== index) });
  }

  function setNotifyPatient(value: boolean) {
    setJobBoth((prev) => prev && { ...prev, notifyPatient: value });
  }

  function minimizeJob() {
    setJobBoth((prev) => prev && { ...prev, minimized: true });
  }

  function reopenJob() {
    setJobBoth((prev) => prev && { ...prev, minimized: false });
  }

  function dismissJob() {
    onUploadedRef.current = null;
    setJobBoth(() => null);
  }

  function dismissToast() {
    setToast(null);
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
    updateFile(index, { reportFileId: initData.report_file_id });

    const onUploadProgress = (evt: { loaded: number; total?: number }) => {
      const progress = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
      updateFile(index, { progress });
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

  async function runJob() {
    if (!jobRef.current) return;
    setJobBoth((prev) => prev && { ...prev, phase: "running" });

    const controller = new AbortController();
    abortControllerRef.current = controller;
    canceledRef.current = false;

    let lastUploadedAt: string | null = null;
    const newFiles: ReportFile[] = [];
    let anyFailed = false;

    // Upload sequentially, not in parallel: the backend treats the first
    // stored file for a report as the trigger for the "results ready"
    // notification email, and there's no reason to fire several finalize
    // calls at once anyway. Read the queue fresh via jobRef each pass so
    // files appended mid-run (addFilesToJob) are picked up.
    let i = 0;
    while (jobRef.current && i < jobRef.current.files.length) {
      if (canceledRef.current) break;
      const pending = jobRef.current.files[i];
      if (pending.status === "done") {
        i++;
        continue;
      }

      const appointmentId = jobRef.current.appointmentId;
      const notifyPatient = jobRef.current.notifyPatient;
      updateFile(i, { status: "uploading", progress: 0, error: undefined });
      try {
        const finalized = await uploadOne(appointmentId, notifyPatient, i, pending, controller.signal);
        updateFile(i, { status: "done", progress: 100 });
        lastUploadedAt = finalized.uploaded_at;
        newFiles.push(finalized);
      } catch (err) {
        if (canceledRef.current || axios.isCancel(err)) {
          updateFile(i, { status: "canceled" });
        } else {
          anyFailed = true;
          updateFile(i, { status: "error", error: "No se pudo subir." });
        }
      }
      i++;
    }

    abortControllerRef.current = null;

    if (canceledRef.current) {
      setJobBoth((prev) => prev && { ...prev, phase: "error" });
      return;
    }

    setJobBoth((prev) => prev && { ...prev, phase: anyFailed ? "error" : "success" });

    if (!anyFailed && lastUploadedAt) {
      const finished = jobRef.current;
      if (finished) {
        onUploadedRef.current?.(finished.appointmentId, lastUploadedAt, newFiles);
        if (finished.minimized) {
          setToast({ message: `Resultados de ${finished.appointmentLabel} subidos correctamente.` });
        }
      }
    }
  }

  function retryFailed() {
    setJobBoth(
      (prev) =>
        prev && {
          ...prev,
          files: prev.files.map((f) =>
            f.status === "error" || f.status === "canceled"
              ? { ...f, status: "pending" as PendingStatus, progress: 0, error: undefined }
              : f
          ),
        }
    );
    runJob();
  }

  function cancelJob() {
    abortControllerRef.current?.abort();
    canceledRef.current = true;
    setJobBoth(
      (prev) =>
        prev && {
          ...prev,
          phase: "error",
          files: prev.files.map((f) =>
            f.status === "uploading" || f.status === "pending" ? { ...f, status: "canceled" as PendingStatus } : f
          ),
        }
    );
  }

  return (
    <UploadContext.Provider
      value={{
        job,
        toast,
        startJob,
        addFilesToJob,
        removeFileFromJob,
        setNotifyPatient,
        runJob,
        retryFailed,
        cancelJob,
        dismissJob,
        minimizeJob,
        reopenJob,
        canStartJobFor,
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
