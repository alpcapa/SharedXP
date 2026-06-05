import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Follow", href: "/follow" },
  { label: "Help", href: "/help" },
  { label: "Contact Center", href: "/contact" },
  { label: "Legal", href: "/legal" }
];

const SiteFooter = () => {
  const [avatars, setAvatars] = useState([]);

  useEffect(() => {
    supabase
      .from("host_profiles")
      .select("profile:profiles!user_id(id, photo_url)")
      .eq("pause_hosting", false)
      .limit(3)
      .then(({ data }) => {
        if (!data) return;
        const photos = data
          .map((hp) => ({ id: hp.profile?.id, src: hp.profile?.photo_url }))
          .filter((a) => a.id && a.src);
        setAvatars(photos);
      });
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-promo" role="presentation">
        <section className="footer-host-panel">
          <div className="footer-host-copy">
            <h2>Love your sport? Become a host</h2>
            <p>Share your passion, earn money, and meet amazing people.</p>
          </div>
          {avatars.length > 0 && (
            <div className="footer-host-avatars" aria-hidden="true">
              {avatars.map((a) => (
                <img key={a.id} src={a.src} alt="" />
              ))}
            </div>
          )}
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
