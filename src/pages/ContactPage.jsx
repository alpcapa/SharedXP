import { useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";

const ContactPage = ({ currentUser, onLogout }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState(null); // "sending" | "sent" | "error"
  const [errorMsg, setErrorMsg] = useState("Something went wrong. Please try again.");

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
    setErrorMsg("Something went wrong. Please try again.");

    // Authenticated users: direct insert (already gated by Supabase auth)
    if (currentUser) {
      const { error } = await supabase.from("support_messages").insert({
        from_email: fromEmail,
        from_name:  fromName,
        subject:    subject.trim(),
        body_text:  message.trim(),
        reply_to:   fromEmail,
      });
      if (error) { console.error("[contact] insert error:", error); setStatus("error"); return; }
      setStatus("sent");
      setSubject(""); setMessage("");
      return;
    }

    // Unauthenticated users: edge function with honeypot + rate limiting
    try {
      const res = await supabase.functions.invoke("contact-support", {
        body: { fromEmail, fromName, subject: subject.trim(), message: message.trim(), honeypot },
      });
      if (res.error || res.data?.error) {
        setErrorMsg(res.data?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      } else {
        setStatus("sent");
        setSubject(""); setMessage(""); setName(""); setEmail(""); setHoneypot("");
      }
    } catch (err) {
      console.error("[contact] edge function error:", err);
      setStatus("error");
    }
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page contact-center-page">
          <h1 className="admin-title">Contact Center</h1>
          <p className="contact-page-subtitle">
            Send us a message and we'll get back to you as soon as possible.
            Have a quick question? Check the{" "}
            <Link to="/help">Help Center</Link> first.
          </p>

          <div className="contact-page-layout">
            <div className="contact-form-card">
              {status === "sent" ? (
                <div className="support-form-success">
                  <strong>Message sent.</strong> We'll get back to you as soon as possible.
                </div>
              ) : (
                <form className="support-form" onSubmit={handleSubmit}>
                  {/* Honeypot — hidden from users, filled by bots */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", opacity: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
                  />
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
                      rows={6}
                      placeholder="Describe your issue or question in detail…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  {status === "error" && (
                    <p className="support-form-error">{errorMsg}</p>
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
            </div>

            <aside className="contact-page-aside">
              <div className="contact-aside-item">
                <span className="contact-aside-icon" aria-hidden="true">⏱</span>
                <div>
                  <p className="contact-aside-title">Response time</p>
                  <p className="contact-aside-text">We typically respond within 24 hours on business days.</p>
                </div>
              </div>
              <div className="contact-aside-item">
                <span className="contact-aside-icon" aria-hidden="true">🚨</span>
                <div>
                  <p className="contact-aside-title">Safety emergencies</p>
                  <p className="contact-aside-text">For urgent safety situations, contact local emergency services first.</p>
                </div>
              </div>
              <div className="contact-aside-item">
                <span className="contact-aside-icon" aria-hidden="true">❓</span>
                <div>
                  <p className="contact-aside-title">Common questions</p>
                  <p className="contact-aside-text">
                    Our <Link to="/help">Help Center</Link> covers booking, payments, hosting, and more.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default ContactPage;
