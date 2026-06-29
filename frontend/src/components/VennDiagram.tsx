import { useState } from "react";

type HoverZone = "left" | "right" | "bottom" | null;

// Circle hit zones derived from Figma absoluteBoundingBox data (549×549 space).
// Left lobe:   icon at (83,164), label at (61,214)   → center ≈ (175, 235), r≈175
// Right lobe:  icon at (403,132), label at (379,178)  → center ≈ (400, 230), r≈170
// Bottom lobe: icon at (271,404), label at (232,440)  → center ≈ (275, 395), r≈175
const ZONES: { key: NonNullable<HoverZone>; cx: number; cy: number; r: number }[] = [
  { key: "left",   cx: 175, cy: 235, r: 175 },
  { key: "right",  cx: 400, cy: 230, r: 170 },
  { key: "bottom", cx: 275, cy: 395, r: 175 },
];

const SRC: Record<NonNullable<HoverZone> | "default", string> = {
  default: "/images/venn-default.png",
  left:    "/images/venn-hover-left.png",
  right:   "/images/venn-hover-right.png",
  bottom:  "/images/venn-hover-bottom.png",
};

export default function VennDiagram() {
  const [hovered, setHovered] = useState<HoverZone>(null);

  return (
    <div className="relative select-none" style={{ width: 549, height: 549 }}>
      {/* Diagram image — swaps on hover with a fast cross-fade */}
      {(["default", "left", "right", "bottom"] as const).map((key) => (
        <img
          key={key}
          src={SRC[key]}
          alt={key === "default" ? "Tres pilares de OrthoRad" : ""}
          aria-hidden={key !== "default"}
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200"
          style={{ opacity: (hovered ?? "default") === key ? 1 : 0 }}
          draggable={false}
        />
      ))}

      {/* SVG overlay — invisible circular hit areas aligned to each lobe */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 549 549"
        style={{ pointerEvents: "none" }}
      >
        {ZONES.map(({ key, cx, cy, r }) => (
          <circle
            key={key}
            cx={cx}
            cy={cy}
            r={r}
            fill="transparent"
            style={{ pointerEvents: "all", cursor: "default" }}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
    </div>
  );
}
