import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import InlineLoginForm from "../components/InlineLoginForm";
import HostSportTab from "../components/host/HostSportTab";
import HostPaymentTab from "../components/host/HostPaymentTab";
import { COUNTRY_OPTIONS } from "../data/countries";
import { COUNTRY_CITY_OPTIONS } from "../data/countryCities";
import { supabase } from "../lib/supabase";
import {
  getInitialHostProfile,
  validatePaymentTab,
  validateSportsTab,
} from "../components/host/hostUtils";

const HostPage = ({ currentUser, authLoading, onLogout, onEmailLogin, onForgotPassword, onSaveHostProfile, onTogglePauseHosting, onSubmitCmApplication }) => {
  const location = useLocation();
  const isHostSettingsRoute = location.pathname === "/host-settings";

  const initialProfile = useMemo(
    () => getInitialHostProfile(currentUser),
    [currentUser]
  );
  const [hostProfileDraft, setHostProfileDraft] = useState(initialProfile);
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [pauseWarning, setPauseWarning] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchValue, setCountrySearchValue] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchValue, setCitySearchValue] = useState("");
  const [activeTab, setActiveTab] = useState("sports");
  const [isSaving, setIsSaving] = useState(false);
  const countryDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);

  const selectedCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find(
        (c) =>
          c.name.toLowerCase() ===
          hostProfileDraft.country.trim().toLowerCase()
      ) ?? null,
    [hostProfileDraft.country]
  );

  const availableCities = useMemo(() => {
    if (!selectedCountry) return [];
    const cities = COUNTRY_CITY_OPTIONS[selectedCountry.code] ?? [];
    if (hostProfileDraft.city && !cities.includes(hostProfileDraft.city)) {
      return [hostProfileDraft.city, ...cities];
    }
    return cities;
  }, [selectedCountry, hostProfileDraft.city]);

  const filteredCountryOptions = useMemo(() => {
    const search = countrySearchValue.trim().toLowerCase();
    if (!search) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) =>
      c.name.toLowerCase().includes(search)
    );
  }, [countrySearchValue]);

  const filteredCityOptions = useMemo(() => {
    const search = citySearchValue.trim().toLowerCase();
    if (!search) return availableCities;
    return availableCities.filter((c) => c.toLowerCase().includes(search));
  }, [availableCities, citySearchValue]);

  useEffect(() => {
    setHostProfileDraft(initialProfile);
    setActiveSportIndex(0);
    setErrorMessage("");
    setSuccessMessage("");
  }, [initialProfile]);

  useEffect(() => {
    if (activeSportIndex >= hostProfileDraft.sports.length) {
      setActiveSportIndex(Math.max(0, hostProfileDraft.sports.length - 1));
    }
  }, [activeSportIndex, hostProfileDraft.sports.length]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isCountryDropdownOpen &&
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target)
      ) {
        setIsCountryDropdownOpen(false);
      }
      if (
        isCityDropdownOpen &&
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target)
      ) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCountryDropdownOpen, isCityDropdownOpen]);

  if (!currentUser) {
    if (authLoading) {
      return (
        <div className="home-page">
          <div className="middle-page-frame">
            <section className="hero auth-hero">
              <SiteHeader currentUser={currentUser} onLogout={onLogout} />
            </section>
            <main className="middle-section simple-page">
              <p>Loading…</p>
            </main>
            <SiteFooter />
          </div>
        </div>
      );
    }
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section simple-page">
            <InlineLoginForm
              onEmailLogin={onEmailLogin}
              onForgotPassword={onForgotPassword}
              title="Please log in"
              description="You need to log in before becoming a host."
            />
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  if (!isHostSettingsRoute) {
    return <Navigate to="/host-settings" replace />;
  }

  const isHostingPaused = Boolean(hostProfileDraft.pauseHosting);
  const isSportsTabComplete = validateSportsTab(hostProfileDraft).message === "";
  const isPaymentTabComplete = hostProfileDraft.bankDetailsComplete === true;

  const onClearError = () => { setErrorMessage(""); setInvalidField(""); };

  const onSaveSports = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    const { message: validationError, sportIndex, fieldId } = validateSportsTab(hostProfileDraft);
    if (validationError) {
      if (sportIndex !== null) setActiveSportIndex(sportIndex);
      setErrorMessage(validationError);
      setInvalidField(fieldId ?? "");
      setSuccessMessage("");
      return;
    }
    setIsSaving(true);
    const profileToSave = {
      ...hostProfileDraft,
      sports: hostProfileDraft.sports.map((s) => ({
        ...s,
        pricing: Number(s.pricing),
      })),
    };
    const result = await onSaveHostProfile?.(profileToSave);
    setIsSaving(false);
    if (result?.success === false) {
      setErrorMessage(result.message || "Failed to save. Please try again.");
      setSuccessMessage("");
    } else {
      setErrorMessage("");
      setInvalidField("");
      setSuccessMessage("Sport settings saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSavePayment = async (event) => {
    event.preventDefault();
    const { message: validationError, fieldId } = validatePaymentTab(hostProfileDraft);
    if (validationError) {
      setErrorMessage(validationError);
      setInvalidField(fieldId ?? "");
      setSuccessMessage("");
      return;
    }
    const profileToSave = { ...hostProfileDraft, bankDetailsComplete: true };
    const result = await onSaveHostProfile?.(profileToSave);
    if (result?.success === false) {
      setErrorMessage(result.message || "Failed to save. Please try again.");
      setSuccessMessage("");
      return;
    }
    setHostProfileDraft((prev) => ({ ...prev, bankDetailsComplete: true }));
    setErrorMessage("");
    setInvalidField("");
    setSuccessMessage("Payment details saved successfully.");
  };

  const countryDropdown = {
    containerRef: countryDropdownRef,
    isOpen: isCountryDropdownOpen,
    setIsOpen: setIsCountryDropdownOpen,
    searchValue: countrySearchValue,
    setSearchValue: setCountrySearchValue,
    filteredOptions: filteredCountryOptions,
  };

  const cityDropdown = {
    containerRef: cityDropdownRef,
    isOpen: isCityDropdownOpen,
    setIsOpen: setIsCityDropdownOpen,
    searchValue: citySearchValue,
    setSearchValue: setCitySearchValue,
    filteredOptions: filteredCityOptions,
  };

  const navigate = useNavigate();
  const [showCmModal, setShowCmModal] = useState(false);
  const [cmStep, setCmStep] = useState("info");
  const [cmForm, setCmForm] = useState({ sportsBackground: "", motivation: "", contactTimes: "", agreedToCmTerms: false, agreedToContact: false });
  const [cmError, setCmError] = useState("");
  const [cmSubmitting, setCmSubmitting] = useState(false);
  const [cmSuccess, setCmSuccess] = useState(false);
  const [hostedCount, setHostedCount] = useState(currentUser?.hostHistory?.length ?? 0);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("host_id", currentUser.id)
      .eq("status", "completed")
      .then(({ count }) => { if (count !== null) setHostedCount(count); });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.isHost || hostedCount < 3 || currentUser?.isCm) return;
    const key = `cm_eligible_notified_${currentUser.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    supabase.functions.invoke("booking-notify", {
      body: { emailType: "cm_eligible", userId: currentUser.id },
    }).catch((e) => console.error("[cm] eligibility email:", e));
  }, [hostedCount, currentUser?.id, currentUser?.isHost, currentUser?.isCm]);

  const cmEligible = currentUser?.isHost && hostedCount >= 3;

  const onCmFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCmForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onCmSubmit = async (e) => {
    e.preventDefault();
    if (!cmForm.sportsBackground.trim()) { setCmError("Please describe your sports background."); return; }
    if (!cmForm.motivation.trim()) { setCmError("Please share your motivation."); return; }
    if (!cmForm.agreedToCmTerms) { setCmError("Please agree to the Community Manager terms."); return; }
    if (!cmForm.agreedToContact) { setCmError("Please agree to be contacted about Community Manager matters."); return; }
    setCmError("");
    setCmSubmitting(true);
    const result = await onSubmitCmApplication?.({
      city: currentUser?.city || "",
      country: currentUser?.country || "",
      sportsBackground: cmForm.sportsBackground.trim(),
      motivation: cmForm.motivation.trim(),
      contactTimes: cmForm.contactTimes.trim(),
    });
    setCmSubmitting(false);
    if (result?.success === false) {
      setCmError(result.message || "Submission failed. Please try again.");
    } else {
      setCmSuccess(true);
    }
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader
            currentUser={currentUser}
            onLogout={onLogout}
            hostingPausedOverride={isHostingPaused}
          />
        </section>
        <main className="middle-section host-settings-page">
          {cmEligible && !currentUser?.isCm && (
            <div className="cm-host-banner">
              <div className="cm-host-banner-info">
                <strong>Congratulations! 🎉 You are eligible to apply.</strong>
                <span>You've shown yourself to be an active host to become our Community Manager. Please <button type="button" className="cm-banner-link" onClick={() => { setCmStep("info"); setCmSuccess(false); setShowCmModal(true); }}>click here</button> to learn more and apply.</span>
              </div>
            </div>
          )}
          <div className="host-settings-top-bar">
            <div>
              <h1
                className={isHostingPaused ? "host-settings-title-paused" : ""}
              >
                {isHostingPaused ? "Hosting Paused" : "Host Settings"}
              </h1>
              <p>
                {isHostingPaused
                  ? "Hosting is currently paused. Resume hosting when you're ready."
                  : "Manage your sport offerings and payment details."}
              </p>
            </div>
            <div className="profile-summary-actions">
              <Link to="/user-profile" className="btn btn-primary">
                My Profile
              </Link>
            </div>
          </div>

          <div className="host-tab-actions-row">
          <div
            className="host-tab-bar"
            role="tablist"
            aria-label="Host settings sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "sports"}
              className={`host-tab-btn${
                activeTab === "sports" ? " active" : ""
              }`}
              onClick={() => {
                setActiveTab("sports");
                setErrorMessage("");
                setInvalidField("");
                setSuccessMessage("");
              }}
            >
              Sport Setup
              {isSportsTabComplete ? (
                <span
                  className="host-tab-status host-tab-status-ok"
                  aria-label="complete"
                >
                  ✓
                </span>
              ) : (
                <span
                  className="host-tab-status host-tab-status-warn"
                  aria-label="incomplete"
                >
                  !
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "payment"}
              className={`host-tab-btn${
                activeTab === "payment" ? " active" : ""
              }`}
              onClick={() => {
                setActiveTab("payment");
                setErrorMessage("");
                setInvalidField("");
                setSuccessMessage("");
              }}
            >
              Payment Details
              {isPaymentTabComplete ? (
                <span
                  className="host-tab-status host-tab-status-ok"
                  aria-label="complete"
                >
                  ✓
                </span>
              ) : (
                <span
                  className="host-tab-status host-tab-status-warn"
                  aria-label="incomplete"
                >
                  !
                </span>
              )}
            </button>
          </div>
          <div className="pause-hosting-group">
              <label className="hosting-pause-toggle" htmlFor="pauseHosting">
                <span>{isHostingPaused ? "Resume Hosting" : "Pause Hosting"}</span>
                <input
                  id="pauseHosting"
                  type="checkbox"
                  role="switch"
                  aria-checked={isHostingPaused}
                  checked={isHostingPaused}
                  onChange={async (event) => {
                    const newPaused = event.target.checked;
                    if (newPaused && currentUser?.id) {
                      const { data } = await supabase
                        .from("booking_requests")
                        .select("id")
                        .eq("host_id", currentUser.id)
                        .eq("status", "in_progress")
                        .limit(1);
                      if (data?.length > 0) {
                        setPauseWarning("You have an experience in progress. You can pause once it's completed.");
                        return;
                      }
                    }
                    setPauseWarning("");
                    setHostProfileDraft((prev) => ({ ...prev, pauseHosting: newPaused }));
                    onTogglePauseHosting?.(newPaused);
                  }}
                />
                <span className="hosting-pause-switch" aria-hidden="true" />
              </label>
              {pauseWarning && (
                <div className="pause-warning" role="alert">
                  <p className="pause-warning-text">{pauseWarning}</p>
                  <button
                    type="button"
                    className="pause-warning-ok"
                    onClick={() => setPauseWarning("")}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === "sports" && (
            <HostSportTab
              draft={hostProfileDraft}
              setDraft={setHostProfileDraft}
              activeSportIndex={activeSportIndex}
              setActiveSportIndex={setActiveSportIndex}
              errorMessage={errorMessage}
              successMessage={successMessage}
              setErrorMessage={setErrorMessage}
              setSuccessMessage={setSuccessMessage}
              invalidField={invalidField}
              onClearError={onClearError}
              countryDropdown={countryDropdown}
              cityDropdown={cityDropdown}
              onSubmit={onSaveSports}
              isSaving={isSaving}
            />
          )}

          {activeTab === "payment" && (
            <HostPaymentTab
              draft={hostProfileDraft}
              setDraft={setHostProfileDraft}
              isPaymentTabComplete={isPaymentTabComplete}
              errorMessage={errorMessage}
              successMessage={successMessage}
              invalidField={invalidField}
              onClearError={onClearError}
              onSubmit={onSavePayment}
            />
          )}

          {showCmModal && (
            <div className="cm-modal-backdrop" onClick={() => { setShowCmModal(false); setCmStep("info"); }}>
              <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
                {cmSuccess ? (
                  <div className="cm-modal-success">
                    <p>Your application has been submitted. We'll be in touch soon!</p>
                    <button type="button" className="btn btn-primary" onClick={() => { setShowCmModal(false); setCmStep("info"); }}>Close</button>
                  </div>
                ) : cmStep === "info" ? (
                  <>
                    <h2 className="cm-modal-title">Become our Community Manager (CM)</h2>
                    <p className="cm-modal-intro">
                      Community Managers are SharedXP's trusted local ambassadors. As a CM you grow the community in your city by sharing your unique invite code with sports enthusiasts.
                    </p>
                    <div className="cm-info-benefits">
                      <h4>Benefits</h4>
                      <ul>
                        <li>Earn 5% commission on every booking from users you referred</li>
                        <li>Your own unique invite code (e.g. SXP-LON-A2K5)</li>
                        <li>A personal CM Dashboard to track referrals and earnings in real time</li>
                        <li>Be the face of SharedXP in your city</li>
                      </ul>
                    </div>
                    <div className="cm-modal-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowCmModal(false); setCmStep("info"); }}>Cancel</button>
                      <button type="button" className="btn btn-primary" onClick={() => setCmStep("form")}>Continue</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="cm-modal-title">Apply to become our Community Manager</h2>
                    <p className="cm-modal-intro">
                      Tell us about yourself and why you'd be a great SharedXP ambassador. We'll review your application and get back to you within 5 business days.
                    </p>
                    <form onSubmit={onCmSubmit} className="cm-application-form">
                      <label htmlFor="cm-sports-bg">Your sports background</label>
                      <textarea
                        id="cm-sports-bg"
                        name="sportsBackground"
                        rows={3}
                        placeholder="Describe your sports experience, disciplines you practice, and your community involvement…"
                        value={cmForm.sportsBackground}
                        onChange={onCmFormChange}
                      />
                      <label htmlFor="cm-motivation">Why do you want to be a CM?</label>
                      <textarea
                        id="cm-motivation"
                        name="motivation"
                        rows={3}
                        placeholder="Tell us what motivates you to grow the SharedXP community…"
                        value={cmForm.motivation}
                        onChange={onCmFormChange}
                      />
                      <label htmlFor="cm-contact">Best times to contact you <span className="auth-optional">(optional)</span></label>
                      <input
                        id="cm-contact"
                        name="contactTimes"
                        type="text"
                        placeholder="e.g. Weekday evenings after 6 pm CET"
                        value={cmForm.contactTimes}
                        onChange={onCmFormChange}
                      />
                      <div className="cm-checkbox-row">
                        <input
                          type="checkbox"
                          id="cm-terms"
                          name="agreedToCmTerms"
                          checked={cmForm.agreedToCmTerms}
                          onChange={onCmFormChange}
                        />
                        <label htmlFor="cm-terms">
                          I have read and agreed to the <a href="/community-manager-policy" target="_blank" rel="noopener noreferrer">Community Manager terms</a>
                        </label>
                      </div>
                      <div className="cm-checkbox-row">
                        <input
                          type="checkbox"
                          id="cm-contact-permission"
                          name="agreedToContact"
                          checked={cmForm.agreedToContact}
                          onChange={onCmFormChange}
                        />
                        <label htmlFor="cm-contact-permission">
                          I agree to be contacted by SharedXP regarding CM matters
                        </label>
                      </div>
                      {cmError && <p className="cm-form-error" role="alert">{cmError}</p>}
                      <div className="cm-modal-actions">
                        <button type="button" className="btn btn-light" onClick={() => setCmStep("info")}>Back</button>
                        <button type="submit" className="btn btn-primary" disabled={cmSubmitting}>
                          {cmSubmitting ? "Submitting…" : "Submit Application"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HostPage;
