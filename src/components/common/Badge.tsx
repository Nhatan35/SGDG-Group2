import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type BadgeTone =
  | "brand"
  | "live"
  | "ending"
  | "live-attention"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  tone?: BadgeTone;
  children: ReactNode;
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={["badge", tone, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
