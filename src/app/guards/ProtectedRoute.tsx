import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDemoStore } from "../../store/demoStore";
import type { ActorRole } from "../../types/domain";
import { isStaffRole, workspaceForRole } from "../../config/staffRoles";

export function CustomerGuard({ children }: { children: ReactNode }) {
  const authenticated = useDemoStore((s) => s.authenticated);
  const location = useLocation();
  return authenticated ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/auth/login"
      replace
      state={{ from: `${location.pathname}${location.search}` }}
    />
  );
}
export function AdminGuard({ children }: { children: ReactNode }) {
  const { adminAuthenticated, actorRole } = useDemoStore();
  const location = useLocation();
  if (!adminAuthenticated || !isStaffRole(actorRole))
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  return <>{children}</>;
}
export function InternalRoleGuard({
  children,
  roles,
}: {
  children: ReactNode;
  roles: ActorRole[];
}) {
  const { adminAuthenticated, actorRole } = useDemoStore();
  const location = useLocation();
  if (!adminAuthenticated || !isStaffRole(actorRole))
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  return roles.includes(actorRole) ? (
    <>{children}</>
  ) : (
    <Navigate
      to={workspaceForRole(actorRole)}
      replace
      state={{ deniedFrom: location.pathname }}
    />
  );
}
