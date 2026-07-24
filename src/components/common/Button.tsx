import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { Link, type LinkProps } from "react-router-dom";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "link"
  | "live";

export type ButtonSize = "sm" | "md" | "lg";

type SharedButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

export type ButtonProps = SharedButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    loading?: boolean;
    loadingText?: string;
  };

export type ButtonLinkProps = SharedButtonProps &
  Omit<LinkProps, "children" | "className"> & {
    className?: string;
  };

const legacyVariantClass = (variant: ButtonVariant) =>
  variant === "live" ? "primary live" : variant;

const buttonClassName = ({
  variant,
  size,
  fullWidth,
  className,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) =>
  [
    "button",
    "sgdg-button",
    legacyVariantClass(variant),
    `sgdg-button--${variant}`,
    `sgdg-button--${size}`,
    fullWidth ? "sgdg-button--full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

function ButtonContent({
  children,
  leftIcon,
  rightIcon,
}: Pick<SharedButtonProps, "children" | "leftIcon" | "rightIcon">) {
  return (
    <>
      {leftIcon && (
        <span className="sgdg-button__icon" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className="sgdg-button__label">{children}</span>
      {rightIcon && (
        <span className="sgdg-button__icon" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = "Đang xử lý",
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, fullWidth, className })}
    >
      <span
        className="sgdg-button__content"
        aria-hidden={loading || undefined}
      >
        <ButtonContent
          leftIcon={leftIcon}
          rightIcon={rightIcon}
        >
          {children}
        </ButtonContent>
      </span>
      {loading && (
        <span className="sgdg-button__loading" role="status">
          <LoaderCircle aria-hidden="true" />
          <span>{loadingText}</span>
        </span>
      )}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={buttonClassName({ variant, size, fullWidth, className })}
    >
      <span className="sgdg-button__content">
        <ButtonContent
          leftIcon={leftIcon}
          rightIcon={rightIcon}
        >
          {children}
        </ButtonContent>
      </span>
    </Link>
  );
}
