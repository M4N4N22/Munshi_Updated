import { cn } from "@/lib/utils";

const SPINNER_SIZES = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[2.5px]",
} as const;

export type SpinnerSize = keyof typeof SPINNER_SIZES;

type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  /** Use on dark backgrounds (integrations, admin dark panels). */
  variant?: "default" | "onDark";
};

function Spinner({
  size = "md",
  className,
  variant = "default",
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full",
        SPINNER_SIZES[size],
        variant === "onDark"
          ? "border-white/15 border-t-emerald-400"
          : "border-zinc-200 border-t-emerald-600",
        className,
      )}
    />
  );
}

export { Spinner };
