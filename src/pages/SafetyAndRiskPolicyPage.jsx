import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const SafetyAndRiskPolicyPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page">
          <h1 className="admin-title">Safety and Risk Policy</h1>
          <article className="legal-page">
            <p className="legal-last-updated">Last updated: June 6, 2026</p>
            <p>
              SharedXP promotes safer experiences by defining minimum safety expectations for hosts and participants.
              Because activities may involve physical risk, users remain responsible for informed participation,
              compliance with local rules, and prudent behavior.
            </p>

            <section className="legal-section">
              <h2>1. Scope</h2>
              <p>
                This policy applies to users, hosts, participants, and interactions related to activities arranged through
                SharedXP, including pre-booking communication, on-site participation, and incident reporting.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Core Safety Principles</h2>
              <ul>
                <li>Provide accurate descriptions of skill level, location, timing, and equipment needs.</li>
                <li>Use clear communication before and during activities.</li>
                <li>Respect local law, venue rules, and public-safety instructions at all times.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>3. Host Duties</h2>
              <ul>
                <li>Assess expected participant level and suitability of session conditions.</li>
                <li>Disclose known risks, weather exposure, terrain difficulty, and required equipment.</li>
                <li>Provide safety briefings and stop or modify activities when conditions become unsafe.</li>
                <li>Maintain any legally required permits, certifications, or local authorizations.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Participant Duties</h2>
              <ul>
                <li>Assess personal health readiness and seek medical advice where appropriate.</li>
                <li>Follow host instructions and use recommended protective equipment.</li>
                <li>Do not participate while impaired or in a condition that may increase risk to others.</li>
                <li>Respect other users, venue staff, property, and community safety expectations.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Prohibited Conduct</h2>
              <ul>
                <li>Violence, threats, harassment, discrimination, or coercive behavior.</li>
                <li>Fraud, impersonation, deceptive safety claims, or concealment of known hazards.</li>
                <li>Any action that creates unacceptable risk to persons, property, or public safety.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>6. Incident and Emergency Handling</h2>
              <p>
                In urgent situations, users should contact local emergency services first. After immediate risks are
                handled, incidents should be reported to SharedXP with factual details, timestamps, and available
                evidence so appropriate review measures can be taken.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Review and Enforcement</h2>
              <p>
                SharedXP may review reports, request additional information, and apply proportional measures
                depending on the nature and severity of the issue:
              </p>
              <ul>
                <li>
                  <strong>Content moderation:</strong> Field posts reported as inappropriate may be temporarily
                  suspended pending review or permanently removed. The poster is notified of the action taken.
                </li>
                <li>
                  <strong>Account suspension:</strong> accounts may be temporarily suspended where a safety or
                  conduct concern requires investigation. The affected user is notified by email and may contact
                  support to appeal.
                </li>
                <li>
                  <strong>Account closure:</strong> accounts may be permanently closed for serious or repeated
                  violations. A 30-day grace period applies before account data is deleted. The affected user
                  is notified by email and may contact support to appeal within that window.
                </li>
              </ul>
              <p>
                SharedXP reserves the right to take immediate protective action without prior notice where there
                is an urgent safety or fraud concern.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Risk and Insurance Position</h2>
              <p>
                Sports and outdoor activities carry inherent risk, including serious injury. Unless expressly stated for a
                specific program, SharedXP does not provide default personal accident, medical, travel, or liability
                insurance coverage.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Related Documents</h2>
              <ul>
                <li>
                  Terms &amp; Conditions: <Link to="/terms-and-conditions">/terms-and-conditions</Link>
                </li>
                <li>
                  Disclaimers Notice: <Link to="/disclaimers">/disclaimers</Link>
                </li>
                <li>
                  Cancellation Policy: <Link to="/cancellation-policy">/cancellation-policy</Link>
                </li>
                <li>
                  Payments and Payout Terms (including dispute process):{" "}
                  <Link to="/payments-and-payout-terms">/payments-and-payout-terms</Link>
                </li>
              </ul>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default SafetyAndRiskPolicyPage;
