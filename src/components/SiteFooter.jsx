import { Link } from "react-router-dom";
import { buddies } from "../data/buddies";

const trustedHighlights = [
  {
    icon: "🔒",
    iconLabel: "Trusted community",
    title: "Trusted community",
    detail: "Verified profiles & reviews"
  },
  {
    icon: "💳",
    iconLabel: "Secure payments",
    title: "Secure payments",
    detail: "We protect every transaction"
  },
  {
    icon: "🕓",
    iconLabel: "24/7 support",
    title: "24/7 support",
    detail: "We're here for you"
  }
];

const hostAvatars = buddies.slice(0, 3);
const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Follow", href: "/follow" },
  { label: "Help", href: "/help" },
  { label: "Legal", href: "/terms-and-conditions" }
];

const SiteFooter = () => {
  return (
    <footer className="site-footer">
      <div className="footer-promo" role="presentation">
        <section className="footer-host-panel">
          <div className="footer-host-copy">
            <h2>Love your sport? Become a host</h2>
            <p>Share your passion, earn money, and meet amazing people.</p>
          </div>
          <div className="footer-host-avatars" aria-hidden="true">
            {hostAvatars.map((buddy) => (
              <img key={buddy.id} src={buddy.image} alt="" />
            ))}
          </div>
          <Link to="/become-a-host" className="footer-host-button">
            Join as a Host
          </Link>
        </section>

        <section className="footer-trust-panel">
          {trustedHighlights.map((highlight) => (
            <article key={highlight.title} className="footer-trust-item">
              <span className="footer-trust-icon">
                <span role="img" aria-label={highlight.iconLabel}>
                  {highlight.icon}
                </span>
              </span>
              <div>
                <h3>{highlight.title}</h3>
                <p>{highlight.detail}</p>
              </div>
            </article>
          ))}
        </section>
      </div>

      <nav className="footer-links" aria-label="Footer">
        {footerLinks.map((item) => (
          <Link key={item.label} to={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
};

export default SiteFooter;
