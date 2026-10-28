import { cn } from "cn";

export function Seal({ className }: { className?: string }) {
  return (
    <span
      aria-label="爭"
      className={cn(
        "inline-flex size-11 shrink-0 select-none items-center justify-center rounded-[22%] bg-seal font-display text-[1.6rem] leading-none text-white",
        className,
      )}
    >
      爭
    </span>
  );
}
