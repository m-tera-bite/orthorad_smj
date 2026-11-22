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

// "YYYY-MM-DD" → "DD/MM/YYYY" for display in the text field.
function toDisplay(value: string) {
  const p = parseValue(value);
  return p ? `${pad(p.day)}/${pad(p.month + 1)}/${p.year}` : "";
}

// Progressively format what the user types as DD/MM/AAAA, inserting the
// slashes automatically. A pasted ISO date ("1990-05-01") is accepted too.
function formatTyped(raw: string) {
  const iso = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(raw);
  if (iso) return `${iso[3].padStart(2, "0")}/${iso[2].padStart(2, "0")}/${iso[1]}`;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// "DD/MM/YYYY" → "YYYY-MM-DD" when it is a real calendar date within the
// allowed years; null otherwise (incomplete, 31/02, out of range…).
function typedToValue(text: string, minYear: number, maxYear: number) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  if (year < minYear || year > maxYear || month < 0 || month > 11) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return `${year}-${pad(month + 1)}-${pad(day)}`;
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
  placeholder = "DD/MM/AAAA",
  minYear = new Date().getFullYear() - 110,
  maxYear = new Date().getFullYear(),
}: Props) {
  const parsed = parseValue(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear() - 30);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [text, setText] = useState(toDisplay(value));
  const [invalid, setInvalid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the text field in sync when the value changes from outside
  // (calendar click, "Limpiar", parent reset) — but don't clobber what the
  // user is typing if it already represents the same date.
  useEffect(() => {
    if (typedToValue(text, minYear, maxYear) !== value) {
      setText(toDisplay(value));
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleType(raw: string) {
    const next = formatTyped(raw);
    setText(next);
    setInvalid(false);
    if (next === "") {
      if (value) onChange("");
      return;
    }
    const iso = typedToValue(next, minYear, maxYear);
    if (iso) {
      const p = parseValue(iso)!;
      setViewYear(p.year);
      setViewMonth(p.month);
      if (iso !== value) onChange(iso);
    } else if (next.length === 10) {
      setInvalid(true);
    }
  }

  // Leaving the field with an incomplete or impossible date: flag it and
  // fall back to the last valid value so the form never holds garbage.
  function commitText() {
    if (text === "" || typedToValue(text, minYear, maxYear)) return;
    setInvalid(true);
    setText(toDisplay(value));
  }

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
        commitText();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text, value]);

  function selectDay(day: number) {
    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(iso);
    setText(toDisplay(iso));
    setInvalid(false);
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
    <div
      className="relative"
      ref={containerRef}
      onBlur={(e) => {
        // Tabbing out of the whole widget (input + popup) closes it. A null
        // relatedTarget is a mouse click (Safari doesn't focus clicked
        // buttons) — the click-outside listener handles that case instead.
        const next = e.relatedTarget as Node | null;
        if (next && !containerRef.current?.contains(next)) {
          setOpen(false);
          commitText();
        }
      }}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid}
          onChange={(e) => handleType(e.target.value)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setOpen(true);
            if (e.key === "Enter" && open) {
              e.preventDefault();
              setOpen(false);
              commitText();
            }
          }}
          className={`${
            triggerClassName ??
            "w-full text-left border border-divider rounded-[10px] px-4 py-2.5 text-text font-quicksand text-sm focus:outline-none focus:border-secondary bg-white"
          } !pr-10 placeholder:opacity-50 ${invalid ? "!border-red-500" : ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Abrir calendario"
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
            <rect x="1.5" y="2" width="10" height="9.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1.5 4.5h10M4 1v2M9 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {invalid && (
        <p className="mt-1 text-[11px] text-red-500 font-quicksand">
          Fecha inválida. Usa el formato DD/MM/AAAA.
        </p>
      )}

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
              onClick={() => { onChange(""); setText(""); setInvalid(false); setOpen(false); }}
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
