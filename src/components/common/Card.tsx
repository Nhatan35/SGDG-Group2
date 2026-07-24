import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant =
  | "default"
  | "elevated"
  | "outlined"
  | "warm"
  | "live"
  | "flat";

type CardElement = "div" | "article" | "section";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  variant?: CardVariant;
  children: ReactNode;
}

export function Card({
  as: Element = "article",
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <Element
      className={`card sgdg-card sgdg-card--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </Element>
  );
}

export function CardHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`sgdg-card__header ${className}`.trim()}
      {...props}
    />
  );
}

export function CardBody({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`sgdg-card__body ${className}`.trim()}
      {...props}
    />
  );
}

export function CardFooter({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`sgdg-card__footer ${className}`.trim()}
      {...props}
    />
  );
}
