import { motion } from "motion/react";

export interface Zone {
  from: number; // position along the dial, 0 (left) to 1 (right)
  to: number;
  color: string;
  label: string;
}

const CX = 110;
const CY = 100;
const R = 76;
const W = 14;

const point = (t: number, r: number) => {
  const a = Math.PI * (1 - t); // t = 0 is the left end, t = 1 the right end
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};

function arc(t0: number, t1: number, r: number) {
  const a = point(t0, r);
  const b = point(t1, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

/** A hand-built semicircle gauge. `t` is the needle position from 0 to 1, or null to park it. */
export default function Gauge({
  title,
  valueText,
  meaning,
  zones,
  t,
  tick,
  muted = false,
  note,
  bare = false,
}: {
  title: string;
  valueText: string;
  meaning: string;
  zones: Zone[];
  t: number | null;
  tick?: { t: number; label: string } | null;
  muted?: boolean; // greyed-out needle (flagged or undefined)
  note?: string; // why the needle is grey
  bare?: boolean; // no card border (the caller draws its own card)
}) {
  const pos = t === null ? 0 : Math.min(1, Math.max(0, t));
  return (
    <figure
      className={`flex h-full min-h-0 min-w-0 flex-col items-center px-2 pb-1 pt-2 ${bare ? "" : "rounded-xl border border-line bg-card"}`}
      data-testid="gauge"
      data-title={title}
    >
      <figcaption className="text-xs font-black uppercase tracking-wide text-muted">{title}</figcaption>
      <svg viewBox="0 0 220 112" className="min-h-0 w-full max-w-[230px] flex-1 max-[899px]:h-32 max-[899px]:flex-none" role="img" aria-label={`${title}: ${valueText}`}>
        {zones.map((z) => (
          <g key={z.label}>
            <path
              d={arc(z.from + 0.008, z.to - 0.008, R)}
              stroke={z.color}
              strokeWidth={W}
              fill="none"
              opacity={muted ? 0.45 : 1}
            />
            {(() => {
              const p = point((z.from + z.to) / 2, R + W / 2 + 7);
              return (
                <text x={p.x} y={p.y} fontSize="8.5" fontWeight="700" textAnchor="middle" fill="#52606d">
                  {z.label}
                </text>
              );
            })()}
          </g>
        ))}
        {tick && (
          <g data-testid="gauge-tick">
            {(() => {
              const a = point(tick.t, R - W / 2 - 1);
              const b = point(tick.t, R + W / 2 + 1);
              const l = point(tick.t, R - W / 2 - 9);
              return (
                <>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1f2933" strokeWidth="2.5" />
                  <text x={l.x} y={l.y} fontSize="7.5" fontWeight="700" textAnchor="middle" fill="#1f2933">
                    {tick.label}
                  </text>
                </>
              );
            })()}
          </g>
        )}
        <motion.g
          // Motion rotates SVG shapes about their own box; the needle's pivot is its right end.
          style={{ originX: 1, originY: 0.5 }}
          initial={{ rotate: 0 }}
          animate={{ rotate: pos * 180 }}
          transition={{ type: "spring", stiffness: 90, damping: 14 }}
          data-testid="needle"
          data-position={pos.toFixed(3)}
        >
          <line x1={CX - 62} y1={CY} x2={CX} y2={CY} stroke={muted ? "#aab4c0" : "#0a2f7a"} strokeWidth="3" strokeLinecap="round" />
        </motion.g>
        <circle cx={CX} cy={CY} r="6" fill={muted ? "#aab4c0" : "#0a2f7a"} />
      </svg>
      <p className="-mt-1 font-mono text-xl font-black leading-tight" data-testid="gauge-value">
        {valueText}
      </p>
      <p className="px-1 text-center text-xs text-muted">{note ?? meaning}</p>
    </figure>
  );
}
