interface Props {
  onClick: () => void;
  disabled?: boolean;
}

/** "Subir Resultados" button for the dashboard page headers (Dashboard,
 *  Citas de hoy, Reportes). Opens the shared UploadModal. */
export default function UploadResultsButton({ onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 border border-white text-white font-montserrat font-bold text-[12px] rounded-[10px] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ padding: "8px 16px", height: 36 }}
    >
      <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
        <path
          d="M6.5 1v7M3 4l3.5-3L10 4M1 10h11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Subir Resultados
    </button>
  );
}
