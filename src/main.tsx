import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { ScrollRevealController } from "./components/motion/ScrollRevealController";
import "./styles/tokens.css";
import "./styles/globals.css";
import "./styles/design-system-foundation.css";
import "./styles/typography.css";
import "./styles/shared-components.css";
import "./styles/header-account.css";
import "./styles/patterns.css";
import "./styles/responsive.css";
import "./styles/pages.css";
import "./styles/news.css";
import "./styles/help.css";
import "./styles/auction-status.css";
import "./styles/homepage.css";
import "./styles/home-hero-search-spotlight-refine.css";
import "./styles/home-auction-card-v2.css";
import "./styles/home-auction-hero-polish.css";
import "./styles/account.css";
import "./styles/account-template.css";
import "./styles/account-collections.css";
import "./styles/auth-redesign.css";
import "./styles/vneid-auth.css";
import "./styles/wallet.css";
import "./styles/deposit-lifecycle.css";
import "./styles/journey.css";
import "./styles/admin.css";
import "./styles/admin-login-visual.css";
import "./styles/cms.css";
import "./styles/support-management.css";
import "./styles/administration-service.css";
import "./styles/backoffice-polish.css";
import "./styles/finance-workspace.css";
import "./styles/admin-management.css";
import "./styles/final-winner.css";
import "./styles/payment-status.css";
import "./styles/handover-overview.css";
import "./styles/handover-schedule.css";
import "./styles/delivery-tracking.css";
import "./styles/handover-evidence.css";
import "./styles/receipt-confirmation.css";
import "./styles/handover-completion.css";
import "./styles/post-auction-flow.css";
import "./styles/operations-foundation.css";
import "./styles/live-operations.css";
import "./styles/exception-governance.css";
import "./styles/handover-operations.css";
import "./styles/finance-package.css";
import "./styles/audit-timeline.css";
import "./styles/audit-overview.css";
import "./styles/reports-projection.css";
import "./styles/demo.css";
import "./styles/create-sgdg-session.css";
import "./styles/auction-energy-motion.css";
import "./styles/phase2-component-compat.css";
import "./styles/home-featured-card-layout.css";
import "./styles/home-marketing-experience.css";
import "./styles/scroll-motion.css";
import "./styles/home-auction-house-editorial.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollRevealController />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
