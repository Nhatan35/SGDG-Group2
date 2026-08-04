import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { HomePage } from "../pages/public/HomePage";
import { AuctionsPage } from "../pages/public/AuctionsPage";
import { AuctionDetailPage } from "../pages/public/AuctionDetailPage";
import { AuctionLivestreamPage } from "../pages/public/AuctionLivestreamPage";
import { UpcomingPage } from "../pages/public/UpcomingPage";
import { NewsPage } from "../pages/public/NewsPage";
import { HelpPage } from "../pages/public/HelpPage";
import {
  LoginPage,
  RecoveryPage,
  RegisterPage,
  VneidLoginPage,
} from "../pages/auth/AuthPages";
import { AccountLayout } from "./layouts/AccountLayout";
import {
  DashboardPage,
  DepositsPage,
  KycPage,
  MembershipPage,
  MyAuctionsPage,
  MyDeliveriesPage,
  MyPaymentsPage,
  NotificationsPage,
  ProfilePage,
  WatchlistPage,
  WalletPage,
} from "../pages/customer/AccountPages";
import {
  MyBidsPage,
  ParticipantsPage,
} from "../pages/auction/AuctionJourneyPages";
import { ReviewPage } from "../pages/auction/WinnerPages";
import { AuctionResultPage } from "../pages/auction/AuctionResultPage";
import { CandidateResponsePage } from "../pages/auction/CandidateResponsePage";
import { FinalWinnerPage } from "../pages/auction/FinalWinnerPage";
import { PaymentStatusPage } from "../pages/auction/PaymentStatusPage";
import { HandoverOverviewPage } from "../pages/handover/HandoverOverviewPage";
import { HandoverSchedulePage } from "../pages/handover/HandoverSchedulePage";
import { DeliveryTrackingPage } from "../pages/handover/DeliveryTrackingPage";
import { HandoverEvidencePage } from "../pages/handover/HandoverEvidencePage";
import { ReceiptConfirmationPage } from "../pages/handover/ReceiptConfirmationPage";
import { HandoverCompletionPage } from "../pages/handover/HandoverCompletionPage";
import {
  ApprovalPackagePage,
  ApprovalQueuePage,
  AuctionSessionListPage,
  AuctionSessionWorkspacePage,
  OpeningRequestQueuePage,
  OpeningRequestWorkspacePage,
  OperationsDashboardPage,
  RuleConfigurationPage,
  SchedulePublicationPage,
} from "../pages/ops/OperationsPages";
import {
  CandidateFallbackTimelinePage,
  ClosingResultMonitorPage,
  LiveOperationsConsolePage,
} from "../pages/ops/LiveOperationsPages";
import {
  CancellationReviewPage,
  FailedAuctionReviewPage,
  PublicationGovernancePage,
  ReauctionRecommendationPage,
  RemediationPage,
  SensitiveChangeReviewPage,
} from "../pages/governance/ExceptionGovernancePages";
import {
  EligibilityReviewDetailPage,
  EligibilityReviewQueuePage,
} from "../pages/governance/EligibilityReviewPages";
import {
  OpeningRequestGovernanceDetailPage,
  OpeningRequestGovernanceQueuePage,
} from "../pages/governance/OpeningRequestGovernancePages";
import {
  AuctionConfigurationGovernanceDetailPage,
  AuctionConfigurationGovernanceQueuePage,
} from "../pages/governance/AuctionConfigurationGovernancePages";
import { HandoverOperationsPage } from "../pages/ops/HandoverOperationsPage";
import { HandoverSearchPage } from "../pages/governance/HandoverSearchPage";
import { FinancePackagePage } from "../pages/ops/FinancePackagePage";
import {
  FinanceOverrideDetailPage,
  FinanceOverrideQueuePage,
  FinanceOverrideReadPage,
  FinanceOverrideRequestPage,
} from "../pages/governance/FinanceOverridePages";
import { AuditTimelinePage } from "../pages/admin/AuditTimelinePage";
import { ReportsProjectionPage } from "../pages/admin/ReportsProjectionPage";
import {
  getHandoverCaseByAuctionId,
  getHandoverCaseFixture,
} from "../services/mock/handoverService";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/feedback/ErrorBoundary";
import { AdminLayout } from "./layouts/AdminLayout";
import {
  AdminAssetsPage,
  AdminAuctionsPage,
  AdminLoginPage,
  AdminPaymentsPage,
  LiveOpsPage,
} from "../pages/admin/AdminPages";
import { CustomerGovernancePage } from "../pages/admin/CustomerGovernancePage";
import {
  AdminGuard,
  CustomerGuard,
  InternalRoleGuard,
} from "./guards/ProtectedRoute";
import {
  FinanceDashboardPage,
  FinanceReportsPage,
  ReconciliationPage,
  RefundsPage,
  SettlementsPage,
} from "../pages/admin/FinanceWorkspacePages";
import { AuctionRegistrationWizard } from "../pages/auction/AuctionRegistrationWizard";
import { EligibilityStatusPage } from "../pages/auction/EligibilityStatusPage";
import { PreLiveWaitingRoomPage } from "../pages/auction/PreLiveWaitingRoomPage";
import { LiveAuctionRoomPage } from "../pages/auction/LiveAuctionRoomPage";
import { DemoPage } from "../pages/DemoPage";
import { CreateSgdgManagedSessionPage } from "../pages/ops/CreateSgdgManagedSessionPage";
import { AuctionContentPage } from "../pages/ops/AuctionContentPage";
import { AuctionContentReviewPage } from "../pages/ops/AuctionContentReviewPage";
import { AuctionApprovalPackagePage } from "../pages/ops/AuctionApprovalPackagePage";
import { AuctionScheduleDraftPage } from "../pages/ops/AuctionScheduleDraftPage";
import {
  AuctionApprovalPackageGovernanceDetailPage,
  AuctionApprovalPackageGovernanceQueuePage,
} from "../pages/governance/AuctionApprovalPackageGovernancePages";
import { AuctionApprovalReviewDecisionPage } from "../pages/governance/AuctionApprovalReviewDecisionPage";
import { AuctionScheduleConfirmationPage } from "../pages/governance/AuctionScheduleConfirmationPage";
import { AuctionRegistrationOpeningReadinessPage } from "../pages/governance/AuctionRegistrationOpeningReadinessPage";
import { AuctionRegistrationValidationPage } from "../pages/governance/AuctionRegistrationValidationPage";
import { AuctionRegistrationRevalidationPage } from "../pages/governance/AuctionRegistrationRevalidationPage";
import { AuctionMembershipCheckPage } from "../pages/governance/AuctionMembershipCheckPage";
import { AuctionDepositCheckPage } from "../pages/finance/AuctionDepositCheckPage";
import {
  ComplaintQueue,
  ComplaintWorkspace,
  ConversationInbox,
  ConversationWorkspace,
  CustomerLookup,
  DisputeQueue,
  DisputeWorkspace,
  KnowledgeGapQueue,
  RetentionHoldGovernancePage,
  SupportDashboard,
  TicketQueue,
  TicketWorkspace,
} from "../pages/admin/SupportManagementPages";
import {
  CustomerChatPage,
  CustomerCreateComplaint,
  CustomerCreateTicket,
  CustomerSupportHome,
  CustomerTicketDetail,
  CustomerTicketList,
} from "../pages/customer/CustomerSupportPages";
import {
  OpeningRequestFormPage,
  OpeningRequestListPage,
} from "../pages/customer/OpeningRequestPages";
import {
  OpenAuctionEligibilityGuard,
  OpenAuctionPage,
} from "../pages/customer/OpenAuctionPage";
import { AuctionCustomerRegistrationPage } from "../pages/customer/AuctionCustomerRegistrationPage";
import { AuctionRegistrationCorrectionPage } from "../pages/customer/AuctionRegistrationCorrectionPage";
import {
  FinancialInvestigationDetail,
  FinancialInvestigationQueue,
} from "../pages/admin/FinancialInvestigationPages";
import {
  CategoryManagementPage,
  CmsDashboardPage,
  ContentApprovalDetailPage,
  ContentApprovalQueuePage,
  ContentEditorPage,
  ContentListPage,
  FaqManagementPage,
  KnowledgeBasePage,
  KnowledgeProposalInboxPage,
  LivestreamEditorPage,
  LivestreamListPage,
  MediaLibraryPage,
  PolicyManagementPage,
  PublicContentPage,
  PublicLivestreamPage,
  ReplayManagementPage,
} from "../pages/admin/CmsPages";
import {
  AccessRequestDetailPage,
  AccessRequestQueuePage,
  AdministrationDashboardPage,
  ApprovalTaskDetailPage,
  ApprovalTaskQueuePage,
  ConfigurationPage,
  NotificationGovernancePage,
  ReportSnapshotsPage,
  RolePermissionPage,
  SearchGovernancePage,
  WorkflowDefinitionsPage,
  WorkforcePage,
} from "../pages/admin/AdministrationServicePages";
export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/demo" element={<DemoPage />} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/auctions/upcoming" element={<UpcomingPage />} />
          <Route
            path="/auctions/:auctionId/livestream"
            element={<AuctionLivestreamPage />}
          />
          <Route path="/auctions/:auctionId" element={<AuctionDetailPage />} />
          <Route
            path="/auctions/:auctionId/register"
            element={
              <CustomerGuard>
                <AuctionRegistrationWizard />
              </CustomerGuard>
            }
          />
          <Route
            path="/customer/auctions/:sessionId/registration"
            element={
              <CustomerGuard>
                <AuctionCustomerRegistrationPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/customer/auctions/:sessionId/registration/correction"
            element={
              <CustomerGuard>
                <AuctionRegistrationCorrectionPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/auctions/:auctionId/eligibility"
            element={
              <CustomerGuard>
                <EligibilityStatusPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/auctions/:auctionId/waiting-room"
            element={
              <CustomerGuard>
                <PreLiveWaitingRoomPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/auctions/:auctionId/live"
            element={
              <CustomerGuard>
                <LiveAuctionRoomPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/auctions/:auctionId/participants"
            element={<ParticipantsPage />}
          />
          <Route
            path="/auctions/:auctionId/result"
            element={<LegacyAuctionResultRedirect />}
          />
          <Route
            path="/me/auctions/:auctionId/result"
            element={
              <CustomerGuard>
                <AuctionResultPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/auctions/:auctionId/candidate"
            element={
              <CustomerGuard>
                <CandidateResponsePage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/auctions/:auctionId/winner"
            element={
              <CustomerGuard>
                <FinalWinnerPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/auctions/:auctionId/payment"
            element={
              <CustomerGuard>
                <PaymentStatusPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/handover/:caseId"
            element={
              <CustomerGuard>
                <HandoverOverviewPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/handover/:caseId/schedule"
            element={
              <CustomerGuard>
                <HandoverSchedulePage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/handover/:caseId/delivery"
            element={
              <CustomerGuard>
                <DeliveryTrackingPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/handover/:caseId/evidence"
            element={
              <CustomerGuard>
                <HandoverEvidencePage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/handover/:caseId/receipt"
            element={
              <CustomerGuard>
                <ReceiptConfirmationPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/me/handover/:caseId/completion"
            element={
              <CustomerGuard>
                <HandoverCompletionPage />
              </CustomerGuard>
            }
          />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/content/:slug" element={<PublicContentPage />} />
          <Route
            path="/livestreams/:liveId"
            element={<PublicLivestreamPage />}
          />
          <Route
            path="/open-auction"
            element={
              <CustomerGuard>
                <OpenAuctionPage />
              </CustomerGuard>
            }
          />
          <Route
            path="/open-auction/requests"
            element={
              <CustomerGuard>
                <OpenAuctionEligibilityGuard>
                  <OpeningRequestListPage basePath="/open-auction/requests" />
                </OpenAuctionEligibilityGuard>
              </CustomerGuard>
            }
          />
          <Route
            path="/open-auction/requests/new"
            element={
              <CustomerGuard>
                <OpenAuctionEligibilityGuard>
                  <OpeningRequestFormPage
                    create
                    basePath="/open-auction/requests"
                  />
                </OpenAuctionEligibilityGuard>
              </CustomerGuard>
            }
          />
          <Route
            path="/open-auction/requests/:requestId"
            element={
              <CustomerGuard>
                <OpenAuctionEligibilityGuard>
                  <OpeningRequestFormPage basePath="/open-auction/requests" />
                </OpenAuctionEligibilityGuard>
              </CustomerGuard>
            }
          />
          <Route
            element={
              <CustomerGuard>
                <AccountLayout />
              </CustomerGuard>
            }
          >
            <Route path="/account/dashboard" element={<DashboardPage />} />
            <Route path="/account/profile" element={<ProfilePage />} />
            <Route path="/account/wallet" element={<WalletPage />} />
            <Route path="/account/deposits" element={<DepositsPage />} />
            <Route path="/account/kyc" element={<KycPage />} />
            <Route path="/account/membership" element={<MembershipPage />} />
            <Route path="/account/watchlist" element={<WatchlistPage />} />
            <Route path="/account/auctions" element={<MyAuctionsPage />} />
            <Route path="/account/payments" element={<MyPaymentsPage />} />
            <Route path="/account/deliveries" element={<MyDeliveriesPage />} />
            <Route
              path="/account/notifications"
              element={<NotificationsPage />}
            />
            <Route path="/account/bids" element={<MyBidsPage />} />
            <Route
              path="/account/opening-requests"
              element={
                <OpenAuctionEligibilityGuard>
                  <OpeningRequestListPage />
                </OpenAuctionEligibilityGuard>
              }
            />
            <Route
              path="/account/opening-requests/new"
              element={
                <OpenAuctionEligibilityGuard>
                  <OpeningRequestFormPage create />
                </OpenAuctionEligibilityGuard>
              }
            />
            <Route
              path="/account/opening-requests/:requestId"
              element={
                <OpenAuctionEligibilityGuard>
                  <OpeningRequestFormPage />
                </OpenAuctionEligibilityGuard>
              }
            />
            <Route path="/account/support" element={<CustomerSupportHome />} />
            <Route
              path="/account/support/chat"
              element={<CustomerChatPage />}
            />
            <Route
              path="/account/support/tickets"
              element={<CustomerTicketList />}
            />
            <Route
              path="/account/support/tickets/new"
              element={<CustomerCreateTicket />}
            />
            <Route
              path="/account/support/tickets/:ticketId"
              element={<CustomerTicketDetail />}
            />
            <Route
              path="/account/support/complaints/new"
              element={<CustomerCreateComplaint />}
            />
            <Route
              path="/account/winner/:auctionId/confirm"
              element={<LegacyCandidateRedirect />}
            />
            <Route
              path="/account/winner/:auctionId/payment"
              element={<LegacyPaymentRedirect />}
            />
            <Route
              path="/account/handover/:caseId"
              element={<LegacyHandoverRedirect />}
            />
            <Route path="/account/review/:caseId" element={<ReviewPage />} />
          </Route>
        </Route>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/vneid" element={<VneidLoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/recovery" element={<RecoveryPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route path="/ops" element={<OperationsDashboardPage />} />
          <Route
            path="/ops/opening-requests"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <OpeningRequestQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/opening-requests/:requestId"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <OpeningRequestWorkspacePage />
              </InternalRoleGuard>
            }
          />
          <Route path="/ops/auctions" element={<AuctionSessionListPage />} />
          <Route
            path="/ops/auctions/new"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <CreateSgdgManagedSessionPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/auctions/:sessionId"
            element={<AuctionSessionWorkspacePage />}
          />
          <Route
            path="/ops/auctions/:sessionId/rules"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <RuleConfigurationPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/auctions/:sessionId/content"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <AuctionContentPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/auctions/:sessionId/content-review"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <AuctionContentReviewPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/auctions/:sessionId/approval-package"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <AuctionApprovalPackagePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/auctions/:sessionId/schedule"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <AuctionScheduleDraftPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/ops/auctions/:sessionId/schedule-publication"
            element={<SchedulePublicationPage />}
          />
          <Route
            path="/ops/live/:sessionId"
            element={<LiveOperationsConsolePage />}
          />
          <Route
            path="/ops/results/:resultId"
            element={<ClosingResultMonitorPage />}
          />
          <Route
            path="/ops/results/:resultId/candidates"
            element={<CandidateFallbackTimelinePage />}
          />
          <Route
            path="/ops/handover/:caseId"
            element={<HandoverOperationsPage />}
          />
          <Route
            path="/ops/finance-packages/:packageId"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF", "FINANCE"]}>
                <FinancePackagePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/finance/override-requests/new"
            element={
              <InternalRoleGuard roles={["FINANCE"]}>
                <FinanceOverrideRequestPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/finance/customer-registrations/:registrationId/deposit-check"
            element={
              <InternalRoleGuard roles={["FINANCE", "ADMIN"]}>
                <AuctionDepositCheckPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/finance/override-requests/:overrideId"
            element={
              <InternalRoleGuard roles={["FINANCE"]}>
                <FinanceOverrideReadPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/opening-requests"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <OpeningRequestGovernanceQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/opening-requests/:requestId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <OpeningRequestGovernanceDetailPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-configurations"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionConfigurationGovernanceQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-configurations/:configurationId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionConfigurationGovernanceDetailPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-approval-packages"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionApprovalPackageGovernanceQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-approval-packages/:packageId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionApprovalPackageGovernanceDetailPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-approval-reviews/:reviewId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionApprovalReviewDecisionPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-schedules/:sessionId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionScheduleConfirmationPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/auction-registration-readiness/:sessionId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionRegistrationOpeningReadinessPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/customer-registrations/:registrationId/validation"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionRegistrationValidationPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/customer-registration-resubmissions/:resubmissionId/revalidation"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionRegistrationRevalidationPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/customer-registrations/:registrationId/membership-check"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <AuctionMembershipCheckPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/approvals"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <ApprovalQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/approvals/:approvalId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <ApprovalPackagePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/eligibility-reviews"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <EligibilityReviewQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/eligibility-reviews/:reviewId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <EligibilityReviewDetailPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/handover-cases"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <HandoverSearchPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/handover-cases/:caseId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <HandoverOperationsPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/finance-overrides"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <FinanceOverrideQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/finance-overrides/:overrideId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <FinanceOverrideDetailPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/failed-auctions/:failureCaseId"
            element={<FailedAuctionReviewPage />}
          />
          <Route
            path="/governance/failed-auctions/:failureCaseId/reauction"
            element={<ReauctionRecommendationPage />}
          />
          <Route
            path="/governance/changes/:changeId"
            element={<SensitiveChangeReviewPage />}
          />
          <Route
            path="/governance/cancellations/:cancellationId"
            element={<CancellationReviewPage />}
          />
          <Route
            path="/governance/publication/:sessionId"
            element={<PublicationGovernancePage />}
          />
          <Route
            path="/governance/remediation/:remediationId"
            element={<RemediationPage />}
          />

          <Route path="/cms" element={<CmsDashboardPage />} />
          <Route path="/cms/contents" element={<ContentListPage />} />
          <Route path="/cms/contents/new" element={<ContentEditorPage />} />
          <Route
            path="/cms/contents/:contentId/edit"
            element={<ContentEditorPage />}
          />
          <Route path="/cms/media" element={<MediaLibraryPage />} />
          <Route path="/cms/categories" element={<CategoryManagementPage />} />
          <Route path="/cms/policies" element={<PolicyManagementPage />} />
          <Route path="/cms/faqs" element={<FaqManagementPage />} />
          <Route path="/cms/knowledge-base" element={<KnowledgeBasePage />} />
          <Route
            path="/cms/knowledge-proposals"
            element={<KnowledgeProposalInboxPage />}
          />
          <Route path="/cms/livestreams" element={<LivestreamListPage />} />
          <Route
            path="/cms/livestreams/new"
            element={<LivestreamEditorPage />}
          />
          <Route
            path="/cms/livestreams/:liveId/edit"
            element={<LivestreamEditorPage />}
          />
          <Route path="/cms/replays" element={<ReplayManagementPage />} />
          <Route
            path="/governance/content-approvals"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <ContentApprovalQueuePage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/content-approvals/:contentId"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <ContentApprovalDetailPage />
              </InternalRoleGuard>
            }
          />
          <Route
            path="/governance/retention-holds"
            element={
              <InternalRoleGuard roles={["ADMIN"]}>
                <RetentionHoldGovernancePage />
              </InternalRoleGuard>
            }
          />
          <Route path="/support" element={<SupportDashboard />} />
          <Route
            path="/support/conversations"
            element={<ConversationInbox />}
          />
          <Route
            path="/support/conversations/:conversationId"
            element={<ConversationWorkspace />}
          />
          <Route path="/support/tickets" element={<TicketQueue />} />
          <Route
            path="/support/tickets/:ticketId"
            element={<TicketWorkspace />}
          />
          <Route path="/support/complaints" element={<ComplaintQueue />} />
          <Route
            path="/support/complaints/:complaintId"
            element={<ComplaintWorkspace />}
          />
          <Route path="/support/disputes" element={<DisputeQueue />} />
          <Route
            path="/support/disputes/:disputeId"
            element={<DisputeWorkspace />}
          />
          <Route path="/support/customers" element={<CustomerLookup />} />
          <Route
            path="/support/knowledge-gaps"
            element={<KnowledgeGapQueue />}
          />

          <Route path="/finance" element={<FinanceDashboardPage />} />
          <Route
            path="/finance/investigations"
            element={<FinancialInvestigationQueue />}
          />
          <Route
            path="/finance/investigations/:investigationId"
            element={<FinancialInvestigationDetail />}
          />
          <Route path="/finance/refunds" element={<RefundsPage />} />
          <Route
            path="/finance/reconciliation"
            element={<ReconciliationPage />}
          />
          <Route path="/finance/settlements" element={<SettlementsPage />} />
          <Route path="/finance/reports" element={<FinanceReportsPage />} />
          <Route
            path="/ops/assets"
            element={
              <InternalRoleGuard roles={["CONTENT_STAFF"]}>
                <AdminAssetsPage />
              </InternalRoleGuard>
            }
          />
          <Route path="/admin/settings" element={<Navigate to="/admin/configurations" replace />} />
          <Route path="/admin" element={<AdministrationDashboardPage />} />
          <Route path="/admin/workforce" element={<WorkforcePage />} />
          <Route path="/admin/access-requests" element={<AccessRequestQueuePage />} />
          <Route path="/admin/access-requests/:requestId" element={<AccessRequestDetailPage />} />
          <Route path="/admin/roles" element={<RolePermissionPage />} />
          <Route path="/admin/approval-tasks" element={<ApprovalTaskQueuePage />} />
          <Route path="/admin/approval-tasks/:taskId" element={<ApprovalTaskDetailPage />} />
          <Route path="/admin/workflows" element={<WorkflowDefinitionsPage />} />
          <Route path="/admin/configurations" element={<ConfigurationPage />} />
          <Route path="/admin/notifications" element={<NotificationGovernancePage />} />
          <Route path="/admin/search-governance" element={<SearchGovernancePage />} />
          <Route path="/admin/report-snapshots" element={<ReportSnapshotsPage />} />
          <Route path="/admin/users" element={<CustomerGovernancePage />} />
          <Route path="/admin/assets" element={<AdminAssetsPage />} />
          <Route path="/admin/auctions" element={<AdminAuctionsPage />} />
          <Route path="/admin/live-ops/:auctionId" element={<LiveOpsPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/audit" element={<AuditTimelinePage />} />
          <Route path="/admin/reports" element={<ReportsProjectionPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

function LegacyAuctionResultRedirect() {
  const { auctionId } = useParams();
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`/me/auctions/${auctionId}/result${location.search}`}
    />
  );
}

function LegacyCandidateRedirect() {
  const { auctionId } = useParams();
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`/me/auctions/${auctionId}/candidate${location.search}`}
    />
  );
}

function LegacyPaymentRedirect() {
  const { auctionId } = useParams();
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`/me/auctions/${auctionId}/payment${location.search}`}
    />
  );
}

function LegacyHandoverRedirect() {
  const { caseId } = useParams();
  const location = useLocation();
  const fixture = caseId
    ? (getHandoverCaseFixture(caseId) ?? getHandoverCaseByAuctionId(caseId))
    : undefined;
  if (!fixture) return <NotFoundPage />;
  return (
    <Navigate replace to={`/me/handover/${fixture.caseId}${location.search}`} />
  );
}
