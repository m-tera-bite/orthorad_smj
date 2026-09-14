import { useEffect, useRef, useState } from "react";
import { useUpload, UploadJob } from "../../context/UploadContext";

interface Props {
  onExpand: (appointmentId: number) => void;
}

// The job the summary strip highlights: whichever is actively transferring,
// else the oldest queued one, else whichever needs attention/was last done.
function pickPrimary(jobs: UploadJob[]): UploadJob {
  return (
    jobs.find((j) => j.phase === "running") ??
    jobs.find((j) => j.phase === "queued") ??
    jobs.find((j) => j.files.some((f) => f.status === "error" || f.status === "canceled")) ??
    jobs[0]
  );
}

function labelFor(job: UploadJob) {
  const total = job.files.length;
  const doneCount = job.files.filter((f) => f.status === "done").length;
  if (job.phase === "queued") return `En cola — ${job.appointmentLabel}`;
  if (job.phase === "running") return `Subiendo a ${job.appointmentLabel}… ${doneCount}/${total}`;
  if (job.phase === "success") return `Subida completa — ${job.appointmentLabel}`;
  return `Subida detenida — ${job.appointmentLabel}`;
}

function progressFor(job: UploadJob) {
  if (job.phase === "queued" || job.files.length === 0) return 0;
  return Math.round(job.files.reduce((s, f) => s + f.progress, 0) / job.files.length);
}

export default function UploadMiniBar({ onExpand }: Props) {
  const { jobs, cancelJob, retryFailed, dismissJob, reopenJob } = useUpload();
  const minimizedJobs = jobs.filter((j) => j.minimized);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (minimizedJobs.length === 0) setExpanded(false);
  }, [minimizedJobs.length]);

  // Click outside the bar collapses the expanded list back down.
  useEffect(() => {
    if (!expanded) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [expanded]);

  if (minimizedJobs.length === 0) return null;

  function openJob(job: UploadJob) {
    setExpanded(false);
    reopenJob(job.appointmentId);
    onExpand(job.appointmentId);
  }

  const primary = pickPrimary(minimizedJobs);
  const others = minimizedJobs.filter((j) => j.appointmentId !== primary.appointmentId);

  return (
    <div ref={containerRef} className="fixed bottom-0 left-0 md:left-[249px] right-0 z-40 flex flex-col shadow-xl">
      {expanded &&
        others.map((job) => (
          <Row
            key={job.appointmentId}
            job={job}
            onExpand={() => openJob(job)}
            onCancel={() => cancelJob(job.appointmentId)}
            onRetry={() => retryFailed(job.appointmentId)}
            onDismiss={() => dismissJob(job.appointmentId)}
          />
        ))}

      <div className="bg-background-alt border-t border-divider">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openJob(primary)}>
            <p className="font-quicksand text-sm text-text truncate">
              {labelFor(primary)}
              {others.length > 0 && (
                <span className="text-text/50"> (+{others.length} más)</span>
              )}
            </p>
            <div className="mt-1 h-1 bg-secondary/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-150"
                style={{ width: `${progressFor(primary)}%` }}
              />
            </div>
          </div>

          <RowActions
            job={primary}
            onCancel={() => cancelJob(primary.appointmentId)}
            onRetry={() => retryFailed(primary.appointmentId)}
            onDismiss={() => dismissJob(primary.appointmentId)}
          />

          {others.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? "Ocultar otras subidas" : "Ver otras subidas"}
              className="text-text/40 hover:text-text transition-colors flex-shrink-0"
            >
              <svg
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <polyline points="1 1.5 6 6.5 11 1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RowActions({
  job,
  onCancel,
  onRetry,
  onDismiss,
}: {
  job: UploadJob;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const hasErrors = job.files.some((f) => f.status === "error" || f.status === "canceled");
  return (
    <>
      {(job.phase === "running" || job.phase === "queued") && (
        <button
          onClick={onCancel}
          className="text-text/50 hover:text-red-500 transition-colors font-quicksand text-xs flex-shrink-0"
        >
          Cancelar
        </button>
      )}
      {hasErrors && job.phase !== "running" && job.phase !== "queued" && (
        <button
          onClick={onRetry}
          className="text-secondary hover:text-secondary/70 transition-colors font-quicksand text-xs font-semibold flex-shrink-0"
        >
          Reintentar
        </button>
      )}
      {job.phase !== "running" && job.phase !== "queued" && (
        <button
          onClick={onDismiss}
          className="text-text/40 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none"
          title="Cerrar"
        >
          ×
        </button>
      )}
    </>
  );
}

function Row({
  job,
  onExpand,
  onCancel,
  onRetry,
  onDismiss,
}: {
  job: UploadJob;
  onExpand: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-background-alt border-t border-divider">
      <div className="px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          <p className="font-quicksand text-sm text-text truncate">{labelFor(job)}</p>
          <div className="mt-1 h-1 bg-secondary/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all duration-150"
              style={{ width: `${progressFor(job)}%` }}
            />
          </div>
        </div>
        <RowActions job={job} onCancel={onCancel} onRetry={onRetry} onDismiss={onDismiss} />
      </div>
    </div>
  );
}
