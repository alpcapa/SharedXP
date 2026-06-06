import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const ContentAndIntellectualPropertyPolicyPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page">
          <h1 className="admin-title">Content and Intellectual Property Policy</h1>
          <article className="legal-page">
            <p className="legal-last-updated">Last updated: June 6, 2026</p>
            <p>
              This policy explains how SharedXP handles user-generated content, platform intellectual property, and
              notice-and-action requests. It is designed to align with EU transparency and rights-protection principles.
            </p>

            <section className="legal-section">
              <h2>1. Scope and Content Types</h2>
              <p>
                This policy applies to profile text, photos, listings, messages submitted through platform channels,
                reviews, Field community posts (captions and images shared to The Field experience feed), and other
                content published or transmitted through SharedXP features.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. User Ownership and License to SharedXP</h2>
              <p>
                Users retain ownership of their original content. By uploading content to SharedXP, users grant a
                non-exclusive, worldwide, royalty-free license for hosting, displaying, indexing, moderating, and
                processing that content for platform operation, trust and safety, legal compliance, and dispute handling.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. SharedXP Intellectual Property</h2>
              <p>
                SharedXP name, logos, interface design, source code, and original platform materials are protected by
                copyright, trademark, and related rights. Reproduction, scraping, extraction, republication, or
                commercial reuse without authorization is prohibited unless legally permitted.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. User Warranties</h2>
              <ul>
                <li>Users upload only content they own or are licensed/authorized to use.</li>
                <li>Content must not infringe third-party copyright, trademark, personality, or privacy rights.</li>
                <li>Users are responsible for legal claims resulting from unlawful or infringing content they submit.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>5. Prohibited Content Practices</h2>
              <ul>
                <li>Publishing pirated, counterfeit, or otherwise unauthorized third-party material.</li>
                <li>Removing rights-management information or misrepresenting ownership.</li>
                <li>Using content to defame, harass, impersonate, or unlawfully exploit others.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>6. Reporting Inappropriate Content</h2>
              <p>
                Users can report Field posts they believe are inappropriate directly within the app using the Report
                button on each post. Reports are reviewed by the SharedXP moderation team. For intellectual property
                or legal infringement notices, rights holders may also report through SharedXP support/legal channels.
                IP notices should include identification of the protected work, the location of allegedly infringing
                content, supporting rationale, and contact details for follow-up.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Review and Interim Measures</h2>
              <p>
                SharedXP may remove, disable access to, label, suspend, or restrict reported content during review.
                Field posts may be temporarily suspended pending review or permanently removed following a moderation
                decision. We may request additional information from reporters and impacted users to assess legitimacy
                and proportional action.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. User Response and Reconsideration</h2>
              <p>
                Users affected by content action may submit a response through available support channels with relevant
                evidence of rights or authorization. SharedXP may reconsider actions where new, credible information is
                provided.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Repeat Infringement</h2>
              <p>
                Repeated or serious infringement may result in escalating enforcement, including warnings, posting
                restrictions, temporary suspension, or account termination, consistent with applicable law.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Legal Exceptions and Mandatory Rights</h2>
              <p>
                This policy does not remove mandatory legal exceptions or user rights recognized by applicable law,
                including lawful quotation, criticism, commentary, or other protected uses.
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
