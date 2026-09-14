import { useUpload } from "../../context/UploadContext";

interface Props {
  onExpand: (appointmentId: number) => void;
}

export default function UploadMiniBar({ onExpand }: Props) {
  const { job, cancelJob, retryFailed, dismissJob, reopenJob } = useUpload();

  if (!job || !job.minimized) return null;

  const total = job.files.length;
  const doneCount = job.files.filter((f) => f.status === "done").length;
  const hasErrors = job.files.some((f) => f.status === "error" || f.status === "canceled");
  const progress = total > 0 ? Math.round(job.files.reduce((s, f) => s + f.progress, 0) / total) : 0;

  function handleExpand() {
    reopenJob();
    onExpand(job!.appointmentId);
  }

  return (
    <div
      className="fixed bottom-0 left-0 md:left-[249px] right-0 z-40 bg-background-alt border-t border-divider shadow-xl cursor-pointer"
      onClick={handleExpand}
    >
      <div className="px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-quicksand text-sm text-text truncate">
            {job.phase === "running"
              ? `Subiendo a ${job.appointmentLabel}… ${doneCount}/${total}`
              : job.phase === "success"
              ? `Subida completa — ${job.appointmentLabel}`
              : `Subida detenida — ${job.appointmentLabel}`}
          </p>
          <div className="mt-1 h-1 bg-secondary/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {job.phase === "running" && (
          <button
            onClick={(e) => { e.stopPropagation(); cancelJob(); }}
            className="text-text/50 hover:text-red-500 transition-colors font-quicksand text-xs flex-shrink-0"
          >
            Cancelar
          </button>
        )}
        {hasErrors && job.phase !== "running" && (
          <button
            onClick={(e) => { e.stopPropagation(); retryFailed(); }}
            className="text-secondary hover:text-secondary/70 transition-colors font-quicksand text-xs font-semibold flex-shrink-0"
          >
            Reintentar
          </button>
        )}
        {job.phase !== "running" && (
          <button
            onClick={(e) => { e.stopPropagation(); dismissJob(); }}
            className="text-text/40 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none"
            title="Cerrar"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
