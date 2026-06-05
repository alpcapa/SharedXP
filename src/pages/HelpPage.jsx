import { useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";

const HelpPage = ({ currentUser, onLogout }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // "sending" | "sent" | "error"

  const userEmail = currentUser?.email ?? "";
  const userName = currentUser
    ? currentUser.fullName || `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim()
    : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fromEmail = userEmail || email.trim();
    const fromName  = userName  || name.trim();
    if (!fromEmail) { alert("Please enter your email."); return; }
    if (!subject.trim()) { alert("Please enter a subject."); return; }
    if (!message.trim()) { alert("Please enter a message."); return; }

    setStatus("sending");
    const { error } = await supabase.from("support_messages").insert({
      from_email: fromEmail,
      from_name:  fromName,
      subject:    subject.trim(),
      body_text:  message.trim(),
      reply_to:   fromEmail,
    });

    if (error) {
      console.error("[help] support submit error:", error);
      setStatus("error");
    } else {
      setStatus("sent");
      setSubject("");
      setMessage("");
      setName("");
      setEmail("");
    }
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page">
          <h1 className="admin-title">Help Center</h1>
          <article className="legal-page">
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              Welcome to SharedXP Help. This page gives quick guidance for both participants and hosts, including how to
              get support.
            </p>

            <section className="legal-section">
              <h2>1. Contact Support</h2>
              <p>
                Use the form below to reach our support team. We respond to all submissions as quickly as possible.
              </p>
              <ul>
                <li>Share clear details and screenshots when possible.</li>
                <li>For urgent safety emergencies, contact local emergency services first.</li>
              </ul>

              {status === "sent" ? (
                <div className="support-form-success">
                  Message sent — we'll get back to you as soon as possible.
                </div>
              ) : (
                <form className="support-form" onSubmit={handleSubmit}>
                  {!currentUser && (
                    <>
                      <div className="support-form-row">
                        <label className="support-form-label">Your name</label>
                        <input
                          type="text"
                          className="support-form-input"
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="support-form-row">
                        <label className="support-form-label">Your email</label>
                        <input
                          type="email"
                          className="support-form-input"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                  {currentUser && (
                    <div className="support-form-row">
                      <label className="support-form-label">From</label>
                      <p className="support-form-prefill">{userName} · {userEmail}</p>
                    </div>
                  )}
                  <div className="support-form-row">
                    <label className="support-form-label">Subject</label>
                    <input
                      type="text"
                      className="support-form-input"
                      placeholder="What is your message about?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="support-form-row">
                    <label className="support-form-label">Message</label>
                    <textarea
                      className="support-form-textarea"
                      rows={5}
                      placeholder="Describe your issue or question in detail…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  {status === "error" && (
                    <p className="support-form-error">Something went wrong. Please try again or email us directly.</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? "Sending…" : "Send message"}
                  </button>
                </form>
              )}
            </section>

            <section className="legal-section">
              <h2>2. Help for Participants (Users)</h2>
              <ul>
                <li>Browse experiences from the home page and open host profiles to review details.</li>
                <li>Sign up or log in before sending booking requests.</li>
                <li>Use your profile page to keep your personal information up to date.</li>
                <li>Use the history section to review your past bookings.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Help for Hosts</h2>
              <ul>
                <li>Open "Become a Host" to submit or complete your host setup.</li>
                <li>Use host settings to manage your host profile information.</li>
                <li>Track hosting activity from your history area.</li>
                <li>For listing, payout, or account concerns, contact support by email.</li>
              </ul>
            </section>

          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HelpPage;
