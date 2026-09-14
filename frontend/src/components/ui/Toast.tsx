import { useEffect } from "react";

interface Props {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export default function Toast({ message, onDismiss, durationMs = 4000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div className="bg-background-alt rounded-[10px] shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm">
      <svg className="text-secondary flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" opacity="0.15" fill="currentColor" stroke="none" />
        <polyline points="7 12.5 10.5 16 17 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="flex-1 font-quicksand text-sm text-text">{message}</p>
      <button
        onClick={onDismiss}
        className="text-text/40 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none"
        title="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
