import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const HelpPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Help Center</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              Welcome to SharedXP Help. This page gives quick guidance for both participants and hosts, including how to
              get support.
            </p>

            <section className="legal-section">
              <h2>1. Contact Support</h2>
              <p>
                The official support channel is email only:{" "}
                <a href="mailto:support@sharedxp.com">support@sharedxp.com</a>.
              </p>
              <ul>
                <li>Include the email linked to your SharedXP account.</li>
                <li>Share clear details and screenshots when possible.</li>
                <li>For urgent safety emergencies, contact local emergency services first.</li>
              </ul>
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
                <li>Open “Become a Host” to submit or complete your host setup.</li>
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
