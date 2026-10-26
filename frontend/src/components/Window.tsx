import type { ReactNode } from "react";

const BARS = {
  blue: "bg-deep",
  pink: "bg-pink",
  green: "bg-lime",
  orange: "bg-tang",
  sun: "bg-sun !text-ink",
  violet: "bg-xz",
} as const;

export type BarColor = keyof typeof BARS;

/** A retro window: coloured title bar with decorative controls, then the content. */
export default function Window({
  title,
  color = "blue",
  className = "",
  bodyClassName = "",
  label,
  right,
  children,
}: {
  title: string;
  color?: BarColor;
  className?: string;
  bodyClassName?: string;
  label?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`win ${className}`} aria-label={label ?? title}>
      <div className={`win-bar ${BARS[color]}`}>
        <span className="truncate">{title}</span>
        {right ?? (
          <span className="win-dots" aria-hidden>
            <i />
            <i />
          </span>
        )}
      </div>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
