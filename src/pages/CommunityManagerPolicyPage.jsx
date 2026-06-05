import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const CommunityManagerPolicyPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page">
          <h1 className="admin-title">Community Manager Policy</h1>
          <article className="legal-page">
            <p className="legal-last-updated">Last updated: May 21, 2026</p>
            <p>
              This Community Manager Policy ("CM Policy") governs participation in the SharedXP Community Manager
              Program ("the Program"). By submitting an application or accepting a Community Manager role, you agree
              to be bound by this CM Policy in addition to SharedXP's{" "}
              <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>,{" "}
              <Link to="/privacy-notice">Privacy Notice</Link>, and all other applicable policies.
            </p>

            <section className="legal-section">
              <h2>1. Program Overview</h2>
              <p>
                The SharedXP Community Manager Program enables trusted, active members of the SharedXP community to
                help grow the network in their city or region, earn commission on referred bookings, and act as
                ambassadors for the SharedXP mission of connecting people through sport.
              </p>
              <p>
                Community Managers are independent ambassadors — they are not employees, agents, or legal
                representatives of SharedXP. Nothing in this Policy creates an employment, partnership, or joint
                venture relationship.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Eligibility</h2>
              <p>To be eligible for the Program, applicants must:</p>
              <ul>
                <li>Hold an active SharedXP account in good standing;</li>
                <li>Be at least 18 years old;</li>
                <li>Have a verifiable sports background in the city or region they are applying to represent;</li>
                <li>Not currently be subject to any account suspension, warning, or dispute proceeding on SharedXP;</li>
                <li>Have no unresolved violations of SharedXP's Safety and Risk Policy or Content and Intellectual
                Property Policy;</li>
                <li>Comply with any local laws governing referral, marketing, or commission-based activities in their
                jurisdiction.</li>
              </ul>
              <p>
                SharedXP reserves the right to deny any application at its sole discretion without providing a
                reason. Applicants who are declined may reapply after 90 days unless otherwise notified.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Application and Onboarding</h2>
              <p>
                Applications are submitted through the official SharedXP Community Manager application form. SharedXP
                reviews all applications and may request additional information, conduct an interview, or place an
                application on hold pending market needs.
              </p>
              <p>
                Upon acceptance, the Community Manager receives a unique invite code in the format{" "}
                <strong>SXP-[CITY]-[CODE]</strong>. This code is personal, non-transferable, and must be used as
                described in Section 5.
              </p>
              <p>
                Accepted Community Managers receive access to a dedicated CM tab in their SharedXP profile, where
                they can track referrals, earnings, and commission status.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Community Manager Responsibilities</h2>
              <p>Community Managers are expected to:</p>
              <ul>
                <li>Actively promote SharedXP within their city or region through genuine personal networks;</li>
                <li>Represent SharedXP honestly and accurately — no false claims about features, pricing, or
                guarantees;</li>
                <li>Share their unique invite code only with real individuals who are genuinely interested in using
                SharedXP;</li>
                <li>Respond to SharedXP communications in a timely manner;</li>
                <li>Report any issues, complaints, or potential policy violations they become aware of through their
                referral network;</li>
                <li>Keep their SharedXP profile up to date and in good standing for the duration of their CM
                status.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Invite Code and Referral Attribution</h2>
              <p>
                Each Community Manager is issued one unique invite code. A referral is attributed to a Community
                Manager when a new user signs up on SharedXP using that code and subsequently completes a paid
                booking as a guest (attendee).
              </p>
              <p>
                <strong>Attribution rules:</strong>
              </p>
              <ul>
                <li>Only bookings where the referred user pays as a guest (attendee) generate commission.
                Bookings where the referred user earns as a host do not.</li>
                <li>If a user does not use the invite code at sign-up, no referral attribution is possible
                retroactively.</li>
                <li>Community Managers do not earn commission on their own bookings.</li>
                <li>
                  <strong>No code, no commission.</strong> The invite code must be entered at sign-up. SharedXP
                  cannot attribute referrals based on verbal claims or off-platform records.
                </li>
                <li>Referral attribution is lifetime — once a user is linked to a CM's code, all future guest
                bookings by that user generate commission for the CM, unless the CM's status is paused or revoked.</li>
              </ul>
              <p>
                Sharing an invite code in exchange for payment, gifts, or other incentives outside the Program is
                strictly prohibited and will result in immediate revocation of CM status.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Commission Structure</h2>
              <p>
                Community Managers earn a commission of <strong>5% of the gross booking value (GBV)</strong> for
                every completed booking where a referred user pays as a guest (attendee). GBV is the total amount
                paid by the guest before any platform fees or deductions.
              </p>
              <p>
                Commission accrues only on <strong>completed bookings</strong>. Cancelled, disputed, or refunded
                bookings do not generate commission. If a booking is refunded after commission has been approved,
                SharedXP may offset the commission against future earnings.
              </p>
              <p>
                The commission rate may be revised by SharedXP with 30 days' written notice to active Community
                Managers. Bookings completed before the revision date are paid at the rate in effect at the time
                of completion.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Commission Payment</h2>
              <p>
                Commission payments are reviewed and approved manually by SharedXP. SharedXP will notify Community
                Managers of the review cycle and approval status via email to their registered address. Payment is
                made via bank transfer to the account details provided by the Community Manager.
              </p>
              <p>
                SharedXP reserves the right to withhold or delay commission payments pending investigation of any
                suspected misuse of the invite code, fraudulent sign-ups, or policy violations. Community Managers
                are responsible for any taxes, duties, or reporting obligations that apply to commission income in
                their jurisdiction.
              </p>
              <p>
                Commission payments below a minimum threshold may be held and combined with the next payment cycle.
                SharedXP will communicate the current minimum threshold to active Community Managers.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Prohibited Conduct</h2>
              <p>The following actions will result in immediate revocation of CM status and forfeiture of any
              pending commissions:</p>
              <ul>
                <li>Creating fake or duplicate accounts to generate false referral credits;</li>
                <li>Sharing the invite code publicly on coupon sites, open forums, or mass distribution channels
                without SharedXP's prior written consent;</li>
                <li>Offering personal incentives, cashback, or side arrangements to individuals who sign up using
                the code;</li>
                <li>Misrepresenting SharedXP's products, pricing, policies, or commitments to potential users;</li>
                <li>Using SharedXP's name, logo, or branding in marketing materials without prior written
                approval;</li>
                <li>Any conduct that violates SharedXP's Terms &amp; Conditions, Safety and Risk Policy, or Content
                and Intellectual Property Policy.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>9. Status Changes: Pause and Revocation</h2>
              <p>
                <strong>Pause:</strong> SharedXP may temporarily pause a Community Manager's status for reasons
                including but not limited to: policy review, market restructuring, inactivity, or pending
                investigation. During a pause, the invite code is deactivated and no new referrals are tracked.
                Existing commissions already approved continue to be processed. The Community Manager will be
                notified by email. Status may be reinstated at SharedXP's discretion.
              </p>
              <p>
                <strong>Revocation:</strong> SharedXP may permanently revoke CM status for serious or repeated
                policy violations, fraud, legal proceedings, or other conduct materially inconsistent with the
                Program's values. Upon revocation, the invite code is permanently deactivated, and any pending
                unapproved commissions are subject to review. Revocation decisions are final unless SharedXP
                agrees to a review in writing.
              </p>
              <p>
                Community Managers may also voluntarily withdraw from the Program at any time by notifying
                SharedXP in writing. Approved commissions accrued before withdrawal will be paid in the next
                scheduled cycle.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Confidentiality</h2>
              <p>
                Community Managers may, in the course of their role, become aware of non-public information about
                SharedXP's business, strategy, user base, pricing, or operations. Community Managers agree to keep
                such information confidential and not to disclose it to any third party, during or after their
                participation in the Program.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. Intellectual Property</h2>
              <p>
                SharedXP grants Community Managers a limited, non-exclusive, revocable licence to use the
                SharedXP name in the context of their referral activities, subject to any brand guidelines
                communicated by SharedXP. No other rights to SharedXP's trademarks, logos, or content are
                granted. All SharedXP intellectual property remains the exclusive property of SharedXP.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Amendments</h2>
              <p>
                SharedXP may amend this CM Policy at any time. Material changes will be communicated to active
                Community Managers by email at least 14 days before taking effect. Continued participation in the
                Program after the effective date of an amendment constitutes acceptance of the revised Policy.
              </p>
            </section>

            <section className="legal-section">
              <h2>13. Governing Law</h2>
              <p>
                This CM Policy is governed by the laws of the jurisdiction in which SharedXP is incorporated. Any
                disputes arising under this Policy are subject to the dispute resolution provisions set out in
                SharedXP's Terms &amp; Conditions.
              </p>
            </section>

            <section className="legal-section">
              <h2>14. Contact</h2>
              <p>
                Questions about the Community Manager Program or this Policy should be directed to SharedXP through our <Link to="/contact">Contact Center</Link>.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default CommunityManagerPolicyPage;
