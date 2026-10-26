import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={150}>{children}</RadixTooltip.Provider>;
}

/** A small "?" that explains something on hover or focus. */
export default function Help({ text }: { text: string }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>
        <button
          type="button"
          aria-label="What does this mean?"
          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-line text-[10px] font-bold text-muted hover:text-accent"
        >
          ?
        </button>
      </RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-10 max-w-60 rounded-lg border border-line bg-card p-3 text-sm font-normal text-ink"
        >
          {text}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/** Wraps any inline content so hovering or focusing it explains something. */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>
        <span tabIndex={0} className="cursor-help">
          {children}
        </span>
      </RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-10 max-w-64 rounded-lg border border-line bg-card p-3 text-sm font-normal text-ink"
        >
          {text}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
