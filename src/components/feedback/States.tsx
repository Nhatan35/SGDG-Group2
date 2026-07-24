import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  type ComponentType,
  type ReactNode,
  type SVGProps,
  useId,
} from "react";
import { Button } from "../common/Button";

export type FeedbackStateVariant =
  | "loading"
  | "empty"
  | "error"
  | "blocked"
  | "success"
  | "reconnecting"
  | "auction-closed"
  | "auction-cancelled";

export interface FeedbackStateProps {
  variant: FeedbackStateVariant;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
  fullPage?: boolean;
  referenceId?: string;
  announce?: boolean;
  className?: string;
}

const variantIcons: Record<
  FeedbackStateVariant,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  loading: LoaderCircle,
  empty: Inbox,
  error: AlertTriangle,
  blocked: ShieldAlert,
  success: CheckCircle2,
  reconnecting: RefreshCw,
  "auction-closed": Clock3,
  "auction-cancelled": Ban,
};

export function FeedbackState({
  variant,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  compact = false,
  fullPage = false,
  referenceId,
  announce = false,
  className = "",
}: FeedbackStateProps) {
  const titleId = useId();
  const descriptionId = useId();
  const Icon = variantIcons[variant];
  const liveVariant =
    variant === "loading" ||
    variant === "reconnecting" ||
    variant === "success";
  const role =
    variant === "error" && announce
      ? "alert"
      : liveVariant
        ? "status"
        : undefined;

  return (
    <section
      className={[
        "state",
        "sgdg-feedback-state",
        `sgdg-feedback-state--${variant}`,
        compact ? "sgdg-feedback-state--compact" : "",
        fullPage ? "sgdg-feedback-state--full-page" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={variant === "loading" || undefined}
    >
      <span className="sgdg-feedback-state__icon">
        {icon ?? (
          <Icon
            aria-hidden={true}
            className={
              variant === "loading" || variant === "reconnecting"
                ? "spin"
                : undefined
            }
          />
        )}
      </span>
      <h2 id={titleId}>{title}</h2>
      {description && <p id={descriptionId}>{description}</p>}
      {referenceId && (
        <p className="sgdg-feedback-state__reference">
          Mã tham chiếu: <code>{referenceId}</code>
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="sgdg-feedback-state__actions">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </section>
  );
}

export function LoadingState({
  label = "Đang tải dữ liệu",
  description,
  compact,
  fullPage,
}: {
  label?: string;
  description?: ReactNode;
  compact?: boolean;
  fullPage?: boolean;
}) {
  return (
    <FeedbackState
      variant="loading"
      title={label}
      description={description}
      compact={compact}
      fullPage={fullPage}
    />
  );
}

export function EmptyState({
  title = "Chưa có dữ liệu",
  description,
  icon,
  action,
  primaryAction,
  secondaryAction,
  compact,
}: {
  title?: string;
  description: ReactNode;
  icon?: ReactNode;
  /** @deprecated Dùng primaryAction cho consumer mới. */
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
}) {
  return (
    <FeedbackState
      variant="empty"
      title={title}
      description={description}
      icon={icon}
      primaryAction={primaryAction ?? action}
      secondaryAction={secondaryAction}
      compact={compact}
    />
  );
}

export function ErrorState({
  retry,
  title = "Không thể tải dữ liệu",
  description = "Vui lòng thử lại hoặc kiểm tra kết nối.",
  referenceId,
  announce,
}: {
  retry?: () => void;
  title?: string;
  description?: ReactNode;
  referenceId?: string;
  announce?: boolean;
}) {
  return (
    <FeedbackState
      variant="error"
      title={title}
      description={description}
      referenceId={referenceId}
      announce={announce}
      primaryAction={
        retry ? (
          <Button variant="secondary" onClick={retry}>
            Thử lại
          </Button>
        ) : undefined
      }
    />
  );
}

export function BlockedState(props: Omit<FeedbackStateProps, "variant">) {
  return <FeedbackState variant="blocked" {...props} />;
}

export function SuccessState(props: Omit<FeedbackStateProps, "variant">) {
  return <FeedbackState variant="success" {...props} />;
}

export function ReconnectingState(props: Omit<FeedbackStateProps, "variant">) {
  return <FeedbackState variant="reconnecting" {...props} />;
}

export function AuctionClosedState(
  props: Omit<FeedbackStateProps, "variant">,
) {
  return <FeedbackState variant="auction-closed" {...props} />;
}

export function AuctionCancelledState(
  props: Omit<FeedbackStateProps, "variant">,
) {
  return <FeedbackState variant="auction-cancelled" {...props} />;
}
