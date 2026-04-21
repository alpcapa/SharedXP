import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import FieldPage from "./pages/FieldPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import HostPage from "./pages/HostPage";
import HistoryPage from "./pages/HistoryPage";
import FollowPage from "./pages/FollowPage";
import HelpPage from "./pages/HelpPage";
import LoginPage from "./pages/LoginPage";
import MyProfilePage from "./pages/MyProfilePage";
import ProfilePage from "./pages/ProfilePage";
import SignUpPage from "./pages/SignUpPage";
import ContentAndIntellectualPropertyPolicyPage from "./pages/ContentAndIntellectualPropertyPolicyPage";
import DisclaimersPage from "./pages/DisclaimersPage";
import LegalPage from "./pages/LegalPage";
import PaymentsAndPayoutTermsPage from "./pages/PaymentsAndPayoutTermsPage";
import PrivacyNoticePage from "./pages/PrivacyNoticePage";
import SafetyAndRiskPolicyPage from "./pages/SafetyAndRiskPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import useAuth from "./hooks/useAuth";
import NotFoundPage from "./pages/NotFoundPage";
import AboutPage from "./pages/AboutPage";

function App() {
  const authActions = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage {...authActions} />} />
      <Route path="/locals" element={<ExplorePage {...authActions} />} />
      <Route path="/how-it-works" element={<HowItWorksPage {...authActions} />} />
      <Route path="/buddy/:buddyId" element={<ProfilePage {...authActions} />} />
      <Route path="/signup" element={<SignUpPage {...authActions} />} />
      <Route path="/login" element={<LoginPage {...authActions} />} />
      <Route path="/my-profile" element={<MyProfilePage {...authActions} />} />
      <Route path="/become-a-host" element={<HostPage {...authActions} />} />
      <Route path="/host-settings" element={<HostPage {...authActions} />} />
      <Route path="/history" element={<HistoryPage {...authActions} />} />
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
      <Route path="/about" element={<AboutPage {...authActions} />} />
      <Route path="*" element={<NotFoundPage {...authActions} />} />
    </Routes>
  );
}

export default App;
