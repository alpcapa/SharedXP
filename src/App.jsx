import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import BottomNav from "./components/BottomNav";
import InstallBanner from "./components/InstallBanner";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import FieldPage from "./pages/FieldPage";
import HostPage from "./pages/HostPage";
import HistoryPage from "./pages/HistoryPage";
import FollowPage from "./pages/FollowPage";
import HelpPage from "./pages/HelpPage";
import LoginPage from "./pages/LoginPage";
import MyProfilePage from "./pages/MyProfilePage";
import SignUpPage from "./pages/SignUpPage";
import PaymentPage from "./pages/PaymentPage";
import ChatPage from "./pages/ChatPage";
import DisputeResponsePage from "./pages/DisputeResponsePage";
import AdminDisputesPage from "./pages/AdminDisputesPage";
import ContentAndIntellectualPropertyPolicyPage from "./pages/ContentAndIntellectualPropertyPolicyPage";
import DisclaimersPage from "./pages/DisclaimersPage";
import LegalPage from "./pages/LegalPage";
import PaymentsAndPayoutTermsPage from "./pages/PaymentsAndPayoutTermsPage";
import PrivacyNoticePage from "./pages/PrivacyNoticePage";
import SafetyAndRiskPolicyPage from "./pages/SafetyAndRiskPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import useAuth from "./context/AuthContext";
import NotFoundPage from "./pages/NotFoundPage";
import AboutPage from "./pages/AboutPage";
import EventsPage from "./pages/EventsPage";
import UserProfilePage from "./pages/UserProfilePage";
import UnifiedProfilePage from "./pages/UnifiedProfilePage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import LoyaltyProgramPage from "./pages/LoyaltyProgramPage";
import CancellationPolicyPage from "./pages/CancellationPolicyPage";
import CommunityManagerPolicyPage from "./pages/CommunityManagerPolicyPage";
import CMDashboardPage from "./pages/CMDashboardPage";
import AuthConfirmPage from "./pages/AuthConfirmPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { hasRecoveryType } from "./utils/recoveryLink";
import { supabase } from "./lib/supabase";

const BuddyRedirect = () => {
  const { buddyId } = useParams();
  return <Navigate to={`/user/${buddyId}`} replace />;
};

function App() {
  const authActions = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const didRedirect = useRef(false);

  // After OAuth login the browser lands on "/" with postAuthRedirect in
  // sessionStorage. Consume it once to send the user to their intended page.
  useEffect(() => {
    const inRecoveryFlow =
      location.pathname === "/reset-password" ||
      hasRecoveryType({ search: location.search, hash: location.hash });

    if (inRecoveryFlow) return;

    if (!authActions.currentUser) {
      didRedirect.current = false;
      return;
    }
    if (didRedirect.current) return;
    const redirect = sessionStorage.getItem("postAuthRedirect");
    if (redirect) {
      didRedirect.current = true;
      sessionStorage.removeItem("postAuthRedirect");
      navigate(redirect, { replace: true });
    }
  }, [authActions.currentUser, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (location.pathname === "/reset-password") return;
    const isRecoveryLink = hasRecoveryType({
      search: location.search,
      hash: location.hash,
    });

    if (!isRecoveryLink) return;
    navigate(
      `/reset-password${location.search}${location.hash}`,
      { replace: true }
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "PASSWORD_RECOVERY") return;
      if (window.location.pathname === "/reset-password") return;
      navigate("/reset-password", { replace: true });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <>
    <Routes>
      <Route path="/" element={<HomePage {...authActions} />} />
      <Route path="/locals" element={<ExplorePage {...authActions} />} />
      <Route path="/how-it-works" element={<Navigate to="/about" replace />} />
      <Route path="/buddy/:buddyId" element={<BuddyRedirect />} />
      <Route path="/signup" element={<SignUpPage {...authActions} />} />
      <Route path="/login" element={<LoginPage {...authActions} />} />
      <Route path="/my-profile" element={<MyProfilePage {...authActions} />} />
      <Route path="/user-profile" element={<UserProfilePage {...authActions} />} />
      <Route path="/user/:userId" element={<UnifiedProfilePage {...authActions} />} />
      <Route path="/become-a-host" element={<HostPage {...authActions} />} />
      <Route path="/host-settings" element={<HostPage {...authActions} />} />
      <Route path="/history" element={<HistoryPage {...authActions} />} />
      <Route path="/payment-history" element={<PaymentHistoryPage {...authActions} />} />
      <Route path="/loyalty-program" element={<LoyaltyProgramPage {...authActions} />} />
      <Route path="/payment/:bookingRequestId" element={<PaymentPage {...authActions} />} />
      <Route path="/chat/:bookingRequestId" element={<ChatPage {...authActions} />} />
      <Route path="/dispute-response/:disputeId" element={<DisputeResponsePage {...authActions} />} />
      <Route path="/admin/disputes" element={<AdminDisputesPage {...authActions} />} />
      <Route path="/follow" element={<FollowPage {...authActions} />} />
      <Route path="/help" element={<HelpPage {...authActions} />} />
      <Route path="/the-field" element={<FieldPage {...authActions} />} />
      <Route path="/host-history" element={<Navigate to="/history" replace />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditionsPage {...authActions} />} />
      <Route path="/legal" element={<LegalPage {...authActions} />} />
      <Route path="/privacy-notice" element={<PrivacyNoticePage {...authActions} />} />
      <Route
        path="/payments-and-payout-terms"
        element={<PaymentsAndPayoutTermsPage {...authActions} />}
      />
      <Route path="/safety-and-risk-policy" element={<SafetyAndRiskPolicyPage {...authActions} />} />
      <Route
        path="/content-and-intellectual-property-policy"
        element={<ContentAndIntellectualPropertyPolicyPage {...authActions} />}
      />
      <Route path="/disclaimers" element={<DisclaimersPage {...authActions} />} />
      <Route path="/cancellation-policy" element={<CancellationPolicyPage {...authActions} />} />
      <Route path="/community-manager-policy" element={<CommunityManagerPolicyPage {...authActions} />} />
      <Route path="/cm-dashboard" element={<CMDashboardPage {...authActions} />} />
      <Route path="/about" element={<AboutPage {...authActions} />} />
      <Route path="/events" element={<EventsPage {...authActions} />} />
      <Route path="/auth/confirm" element={<AuthConfirmPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage {...authActions} />} />
      <Route path="*" element={<NotFoundPage {...authActions} />} />
    </Routes>
    <InstallBanner />
    <BottomNav currentUser={authActions.currentUser} />
    </>
  );
}

export default App;
