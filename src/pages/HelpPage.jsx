import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const faqGroups = [
  {
    id: "booking",
    icon: "📅",
    title: "Booking & Cancellations",
    faqs: [
      {
        q: "How does SharedXP work?",
        a: "SharedXP connects sports-loving travelers with local hosts. Browse experiences, send a booking request to a host, and once confirmed, meet up to enjoy your sport together. Payments are handled securely through the platform.",
      },
      {
        q: "How do I find and book an experience?",
        a: "Go to Explore to search for local hosts by sport and location. Open a host's profile to see their sports, pricing, and available equipment. Pick a date and time and send a booking request.",
      },
      {
        q: "Can I message a host before the session?",
        a: "Once you send a booking request, a chat thread opens between you and the host so you can discuss details before the session is confirmed.",
      },
      {
        q: "How do I cancel a booking?",
        a: "You can cancel a pending or accepted booking from your booking details page. Refunds depend on the host's cancellation policy — flexible, moderate, or strict — and how far in advance you cancel.",
      },
      {
        q: "What cancellation policies exist?",
        a: (
          <>
            Each host sets their own cancellation policy. You can review it on their profile before booking. For full terms, see our{" "}
            <Link to="/cancellation-policy">Cancellation Policy</Link>.
          </>
        ),
      },
    ],
  },
  {
    id: "payments",
    icon: "💳",
    title: "Payments & Payouts",
    faqs: [
      {
        q: "When am I charged?",
        a: "Payment is processed when you confirm a booking. Funds are held securely until after the session is completed.",
      },
      {
        q: "What is the platform fee?",
        a: "SharedXP charges a 15% service fee plus 5% tax on each booking. This is shown clearly on the payment screen before you confirm.",
      },
      {
        q: "How do I view my payment history?",
        a: (
          <>
            Visit your <Link to="/payment-history">Payment History</Link> page to see all past invoices, amounts, and XP earned.
          </>
        ),
      },
      {
        q: "Can I get a refund?",
        a: "Refunds are processed according to the host's cancellation policy. If the host cancels, you receive a full refund. Disputed bookings are reviewed by our team.",
      },
      {
        q: "What is the XP Loyalty Program?",
        a: (
          <>
            You earn XP on every booking — as a traveler and as a host. XP is calculated from the booking amount in your local currency. Learn more on the{" "}
            <Link to="/loyalty-program">Loyalty Program</Link> page.
          </>
        ),
      },
    ],
  },
  {
    id: "hosting",
    icon: "🏠",
    title: "Hosting",
    faqs: [
      {
        q: "How do I become a host?",
        a: (
          <>
            Open the <Link to="/become-a-host">Become a Host</Link> page and complete your host profile: sports you offer, availability, pricing, and equipment. Your profile goes live once submitted.
          </>
        ),
      },
      {
        q: "What sports can I offer?",
        a: "You can offer any sport you're passionate about — cycling, tennis, running, surfing, yoga, and more. Add multiple sports, each with its own availability and pricing.",
      },
      {
        q: "When do I receive my payout?",
        a: "Payouts are released after a session is marked complete and any dispute window has passed. You can configure your payout details in your host settings.",
      },
      {
        q: "Can I pause my hosting?",
        a: "Yes. Go to Host Settings and toggle the pause option. Your profile will be hidden from Explore while paused, but all your settings and history are preserved.",
      },
      {
        q: "How does pricing work?",
        a: "You set your own price per session for each sport. SharedXP deducts the platform fee before your payout. You can update pricing at any time from your host settings.",
      },
    ],
  },
  {
    id: "account",
    icon: "👤",
    title: "Account & Profile",
    faqs: [
      {
        q: "How do I update my profile?",
        a: (
          <>
            Go to <Link to="/edit-profile">Edit Profile</Link> to update your name, photo, languages, sports, and birthday.
          </>
        ),
      },
      {
        q: "How do I reset my password?",
        a: "On the login page, click \"Forgot password?\" and enter your email. You'll receive a reset link. If you signed up via Google or Apple, your password is managed by those providers.",
      },
      {
        q: "How do I view my booking history?",
        a: (
          <>
            Your <Link to="/history">History</Link> page shows all past experiences — as a traveler and as a host — with dates, amounts, and XP earned.
          </>
        ),
      },
      {
        q: "How do I close or delete my account?",
        a: (
          <>
            To close your account, <Link to="/contact">contact our support team</Link>. Once closed, your account enters a 30-day grace period during which you can contact us to reopen it. After 30 days, your account and all associated personal data are permanently deleted in line with our GDPR obligations.
          </>
        ),
      },
      {
        q: "What happens if my account is suspended?",
        a: (
          <>
            If your account is suspended, you will receive an email explaining the action. Any pending or upcoming booking requests that have not yet started will be automatically cancelled. If you have an experience already in progress at the time of the action, it will be allowed to complete. Suspension is typically a temporary measure pending a review. To appeal or ask questions, please <Link to="/contact">contact our support team</Link> and we will review your case.
          </>
        ),
      },
    ],
  },
  {
    id: "safety",
    icon: "🔒",
    title: "Safety & Trust",
    faqs: [
      {
        q: "How are hosts verified?",
        a: "Hosts complete a detailed profile and are tied to a verified email address. All host profiles are reviewed before going live on Explore.",
      },
      {
        q: "What if there is a dispute?",
        a: "If you have an issue with a completed booking, you can open a dispute from the booking details page within the allowed window. Our team reviews all disputes and works toward a fair resolution.",
      },
      {
        q: "How do I report inappropriate content on The Field?",
        a: "If you see a post on The Field that you believe is inappropriate, tap the Report button on that post. Our moderation team reviews all reports and will suspend or remove posts that violate our community standards. You will receive a confirmation when your report has been received.",
      },
      {
        q: "What should I do in an emergency?",
        a: "Your safety always comes first. Contact local emergency services immediately for any urgent situation. After you're safe, reach out to our support team to report the incident.",
      },
      {
        q: "Are my payments secure?",
        a: "Yes. Payments are processed and held securely through our platform until the session completes. We never share your full payment details with hosts.",
      },
    ],
  },
];

const HelpPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section simple-page help-center-page">
          <h1 className="admin-title">Help Center</h1>
          <p className="help-hero-subtitle">
            Find answers to common questions about booking, payments, hosting, and your account.
          </p>

          <nav className="help-topics-grid" aria-label="Help topics">
            {faqGroups.map((group) => (
              <a key={group.id} href={`#${group.id}`} className="help-topic-card">
                <span className="help-topic-icon" aria-hidden="true">{group.icon}</span>
                <span className="help-topic-label">{group.title}</span>
              </a>
            ))}
          </nav>

          <div className="help-faq-list">
            {faqGroups.map((group) => (
              <section key={group.id} id={group.id} className="help-faq-group">
                <h2 className="help-faq-group-title">
                  <span aria-hidden="true">{group.icon}</span>{" "}{group.title}
                </h2>
                {group.faqs.map((faq, i) => (
                  <details key={i} className="help-faq-item">
                    <summary className="help-faq-summary">{faq.q}</summary>
                    <div className="help-faq-body">{faq.a}</div>
                  </details>
                ))}
              </section>
            ))}
          </div>

          <div className="help-contact-cta">
            <h2>Still need help?</h2>
            <p>Can't find the answer you're looking for? Our support team is here.</p>
            <Link to="/contact" className="btn btn-primary">Contact Center</Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HelpPage;
