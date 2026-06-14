import { cn } from "@/lib/utils";
import { Spinner, type SpinnerSize } from "@/components/ui/spinner";

type LoadingStateProps = {
  /** Optional caption — omit for a spinner-only block. */
  label?: string;
  size?: SpinnerSize;
  className?: string;
  minHeight?: string;
  variant?: "default" | "onDark";
};

function LoadingState({
  label,
  size = "md",
  className,
  minHeight,
  variant = "default",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3",
        minHeight,
        className,
      )}
    >
      <Spinner size={size} variant={variant} />
      {label ? (
        <p
          className={cn(
            "text-sm",
            variant === "onDark" ? "text-zinc-400" : "text-zinc-500",
          )}
        >
          {label}
        </p>
      ) : null}
    </div>
  );
}

export { LoadingState };
