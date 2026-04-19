import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const ContentAndIntellectualPropertyPolicyPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <article className="simple-page legal-page">
            <h1>Content and Intellectual Property Policy</h1>
            <p className="legal-last-updated">Last updated: April 19, 2026</p>
            <p>
              This policy governs ownership, permitted use, and infringement handling for platform content in line with
              EU intellectual property principles.
            </p>

            <section className="legal-section">
              <h2>1. Ownership of User Content</h2>
              <p>
                Users retain ownership of original content they submit (such as text, images, and profile materials).
                By posting content on SharedXP, users grant a non-exclusive license to host, display, and process that
                content for platform operation, moderation, and legal compliance.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Platform Intellectual Property</h2>
              <p>
                SharedXP branding, interface design, software, and original platform materials are protected by
                copyright, trademark, and related rights. Unauthorized copying, scraping, distribution, or derivative
                reuse is prohibited unless allowed by law or prior written permission.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. User Warranties</h2>
              <ul>
                <li>Users must upload only content they own or are authorized to use.</li>
                <li>Content must not infringe third-party rights, including copyright and privacy rights.</li>
                <li>Users are responsible for claims arising from unlawful content they publish.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Notice-and-Action Process</h2>
              <p>
                Rights holders can report allegedly infringing content through SharedXP support channels. SharedXP may
                remove, disable, or restrict content while review is ongoing and may request supporting information from
                reporters and users.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Repeat Infringement and Enforcement</h2>
              <p>
                Accounts involved in repeated or serious infringement may face content removal, account restrictions, or
                termination, subject to applicable law and due process requirements.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Open Legal Rights</h2>
              <p>
                This policy does not limit mandatory rights or exceptions under applicable law, including quotation,
                criticism, and other permitted uses recognized by EU and local legislation.
              </p>
            </section>
          </article>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default ContentAndIntellectualPropertyPolicyPage;
