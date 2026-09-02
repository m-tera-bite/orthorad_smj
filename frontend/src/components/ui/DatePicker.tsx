import { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  triggerClassName?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseValue(value: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first weekday index (0 = Monday .. 6 = Sunday).
function firstWeekday(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export default function DatePicker({
  value,
  onChange,
  triggerClassName,
  placeholder = "AAAA-MM-DD",
  minYear = new Date().getFullYear() - 110,
  maxYear = new Date().getFullYear(),
}: Props) {
  const parsed = parseValue(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear() - 30);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    setViewYear(p?.year ?? today.getFullYear() - 30);
    setViewMonth(p?.month ?? today.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectDay(day: number) {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  }

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = firstWeekday(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          triggerClassName ??
          "w-full text-left border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
        }
      >
        {value || <span className="opacity-50">{placeholder}</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-white rounded-[10px] shadow-xl border border-divider p-3">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="flex-1 border border-divider rounded-[8px] px-2 py-1.5 text-text font-quicksand text-xs focus:outline-none focus:border-secondary bg-white"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="border border-divider rounded-[8px] px-2 py-1.5 text-text font-quicksand text-xs focus:outline-none focus:border-secondary bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i} className="text-center text-[10px] font-montserrat font-bold text-text/40">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const isSelected =
                parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === day;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => selectDay(day)}
                  className={`h-7 rounded-md text-xs font-quicksand transition-colors ${
                    isSelected
                      ? "bg-primary text-white font-semibold"
                      : isToday
                      ? "border border-secondary text-primary"
                      : "text-text hover:bg-background"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="mt-2 w-full text-center text-xs text-secondary font-quicksand underline"
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
