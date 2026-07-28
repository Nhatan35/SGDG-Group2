import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CustomerGuard,
  InternalRoleGuard,
} from "./ProtectedRoute";
import { useDemoStore } from "../../store/demoStore";

describe("route guards", () => {
  beforeEach(() =>
    useDemoStore.setState({
      authenticated: false,
      adminAuthenticated: false,
      actorRole: "CUSTOMER",
    }),
  );

  it("redirects guests to Customer login", () => {
    render(
      <MemoryRouter initialEntries={["/account"]}>
        <Routes>
          <Route
            path="/account"
            element={
              <CustomerGuard>
                <div>Private</div>
              </CustomerGuard>
            }
          />
          <Route path="/auth/login" element={<div>Login required</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Login required")).toBeInTheDocument();
  });

  it("renders authenticated Customer content", () => {
    useDemoStore.setState({ authenticated: true });
    render(
      <MemoryRouter initialEntries={["/account"]}>
        <CustomerGuard>
          <div>Private</div>
        </CustomerGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("allows only ADMIN into the Opening Request governance context", () => {
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
    render(
      <MemoryRouter>
        <InternalRoleGuard roles={["ADMIN"]}>
          <div>Governance context</div>
        </InternalRoleGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText("Governance context")).toBeInTheDocument();
  });

  it("redirects Content Staff away from the ADMIN governance context", () => {
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "CONTENT_STAFF",
    });
    render(
      <MemoryRouter
        initialEntries={["/governance/opening-requests/ORQ-001"]}
      >
        <Routes>
          <Route
            path="/governance/opening-requests/:requestId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <div>Governance context</div>
              </InternalRoleGuard>
            }
          />
          <Route path="/ops" element={<div>Operations workspace</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Operations workspace")).toBeInTheDocument();
    expect(screen.queryByText("Governance context")).not.toBeInTheDocument();
  });
});
