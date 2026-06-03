import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { COUNTRY_OPTIONS } from "../data/countries";
import { supabase } from "../lib/supabase";

const CmApplicationPage = ({ currentUser, authLoading, onLogout, onSubmitCmApplication }) => {
  const navigate = useNavigate();
  const [hostedCount, setHostedCount] = useState(currentUser?.hostHistory?.length ?? 0);
  const [appStatus, setAppStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const fullName = currentUser
    ? currentUser.fullName || [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ")
    : "";
  const profileUrl = currentUser ? `sharedxp.com/user/${currentUser.id}` : "";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    profileUrl: "",
    sportsBackground: "",
    motivation: "",
    contactTimes: "",
    confirmedAge: false,
    confirmedHost: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("host_id", currentUser.id)
      .eq("status", "completed")
      .then(({ count }) => { if (count !== null) setHostedCount(count); });

    supabase
      .from("cm_applications")
      .select("status")
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        setAppStatus(data?.status ?? null);
        setCheckingStatus(false);
      });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    setForm((prev) => ({
      ...prev,
      fullName: fullName,
      email: currentUser.email || "",
      city: currentUser.city || "",
      country: currentUser.country || "",
      profileUrl: profileUrl,
    }));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone.trim()) { setError("Please enter your phone number."); return; }
    if (!form.city.trim()) { setError("Please enter your city."); return; }
    if (!form.country.trim()) { setError("Please select your country."); return; }
    if (!form.sportsBackground.trim()) { setError("Please describe your sports background."); return; }
    if (!form.motivation.trim()) { setError("Please explain why you want to become a CM."); return; }
    if (!form.confirmedAge) { setError("Please confirm you are 18 years of age or older."); return; }
    if (!form.confirmedHost) { setError("Please confirm you are an active SharedXP host with at least 3 completed experiences."); return; }
    setError("");
    setSubmitting(true);
    const result = await onSubmitCmApplication?.({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      profileUrl: form.profileUrl.trim(),
      sportsBackground: form.sportsBackground.trim(),
      motivation: form.motivation.trim(),
      contactTimes: form.contactTimes.trim(),
    });
    setSubmitting(false);
    if (result?.success === false) {
      setError(result.message || "Submission failed. Please try again.");
    } else {
      setSuccess(true);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          </section>
          <main className="middle-section cm-application-page">
            <p style={{ color: "#888", marginTop: 40 }}>Loading…</p>
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader currentUser={null} onLogout={onLogout} />
          </section>
          <main className="middle-section cm-application-page">
            <h1 className="cm-app-page-title">Become a Community Manager</h1>
            <p className="cm-app-page-subtitle">Please sign in to apply.</p>
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  const cmEligible = currentUser.isHost && hostedCount >= 3;

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section cm-application-page">
          <h1 className="cm-app-page-title">Become a Community Manager</h1>
          <p className="cm-app-page-subtitle">
            Grow SharedXP's host network in your city and earn commission on every experience booked by people you invite — anywhere in the world.
          </p>

          {cmEligible ? (
            <div className="cm-app-eligibility-pass">
              <strong>Eligibility check passed</strong> — You are a verified host with {hostedCount} completed experience{hostedCount === 1 ? "" : "s"}.
            </div>
          ) : (
            <div className="cm-app-eligibility-fail">
              {!currentUser.isHost
                ? "You must be a registered host to apply. Please set up your host profile first."
                : `You need at least 3 completed experiences to apply. You currently have ${hostedCount}.`}
            </div>
          )}

          {success ? (
            <div className="cm-app-success">
              <p>Your application has been submitted! We'll review it and get back to you within 5 business days.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate("/host-settings")}>
                Back to Host Settings
              </button>
            </div>
          ) : appStatus === "pending" || appStatus === "interview" ? (
            <div className="cm-app-pending">
              <p>Your application is currently <strong>{appStatus === "interview" ? "in the interview stage" : "under review"}</strong>. We'll be in touch soon.</p>
              <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Go back</button>
            </div>
          ) : appStatus === "accepted" ? (
            <div className="cm-app-pending">
              <p>Your application has already been <strong>accepted</strong>. Visit your profile to see your CM dashboard.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/user/${currentUser.id}`)}>View CM Dashboard</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="cm-application-form cm-app-form">
              <div className="cm-app-field">
                <label htmlFor="cm-full-name">Full name</label>
                <input
                  id="cm-full-name"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="cm-app-field">
                <label htmlFor="cm-email">Email address</label>
                <input
                  id="cm-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="cm-app-field">
                <label htmlFor="cm-phone">
                  Phone number <span className="cm-app-label-hint">(WhatsApp preferred)</span>
                </label>
                <input
                  id="cm-phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={form.phone}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="cm-app-row">
                <div className="cm-app-field">
                  <label htmlFor="cm-city">City to manage</label>
                  <input
                    id="cm-city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="cm-app-field">
                  <label htmlFor="cm-country">Country</label>
                  <select
                    id="cm-country"
                    name="country"
                    value={form.country}
                    onChange={onChange}
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cm-app-field">
                <label htmlFor="cm-profile-url">Your SharedXP profile URL</label>
                <input
                  id="cm-profile-url"
                  name="profileUrl"
                  type="text"
                  placeholder="sharedxp.com/user/…"
                  value={form.profileUrl}
                  onChange={onChange}
                />
              </div>

              <div className="cm-app-field">
                <label htmlFor="cm-sports-bg">Sports background</label>
                <p className="cm-app-field-hint">Which sports, how long, what level — still active?</p>
                <textarea
                  id="cm-sports-bg"
                  name="sportsBackground"
                  rows={4}
                  value={form.sportsBackground}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="cm-app-field">
                <label htmlFor="cm-motivation">Why do you want to become a CM?</label>
                <textarea
                  id="cm-motivation"
                  name="motivation"
                  rows={4}
                  value={form.motivation}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="cm-app-field">
                <label htmlFor="cm-contact-times">Preferred times to be contacted</label>
                <input
                  id="cm-contact-times"
                  name="contactTimes"
                  type="text"
                  placeholder="e.g. Weekends 10:00–18:00 CET"
                  value={form.contactTimes}
                  onChange={onChange}
                />
              </div>

              <div className="cm-checkbox-row">
                <input
                  type="checkbox"
                  id="cm-confirm-age"
                  name="confirmedAge"
                  checked={form.confirmedAge}
                  onChange={onChange}
                />
                <label htmlFor="cm-confirm-age">I confirm I am 18 years of age or older.</label>
              </div>

              <div className="cm-checkbox-row">
                <input
                  type="checkbox"
                  id="cm-confirm-host"
                  name="confirmedHost"
                  checked={form.confirmedHost}
                  onChange={onChange}
                />
                <label htmlFor="cm-confirm-host">
                  I confirm I am an active SharedXP host with at least 3 completed experiences.
                </label>
              </div>

              {error && <p className="cm-form-error" role="alert">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary cm-app-submit"
                disabled={submitting || !cmEligible}
              >
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
};

export default CmApplicationPage;
