import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const socialChannels = [
  {
    name: "YouTube",
    icon: "▶️",
    description: "Watch stories, host highlights, and sport travel inspiration.",
    href: "https://www.youtube.com"
  },
  {
    name: "Instagram",
    icon: "📸",
    description: "See daily moments, reels, and local sport experiences.",
    href: "https://www.instagram.com"
  },
  {
    name: "Facebook",
    icon: "👍",
    description: "Join our community updates, groups, and event drops.",
    href: "https://www.facebook.com"
  },
  {
    name: "TikTok",
    icon: "🎵",
    description: "Catch short clips from travelers and hosts around the world.",
    href: "https://www.tiktok.com"
  }
];

const FollowPage = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section">
          <section className="follow-page">
            <div className="follow-page-header">
              <h1>Follow SharedXP</h1>
              <p>
                Connect with us across social media to discover new locals, sports moments, and
                travel-ready experiences.
              </p>
            </div>

            <div className="follow-grid">
              {socialChannels.map((channel) => (
                <article key={channel.name} className="follow-card">
                  <div className="follow-card-head">
                    <span className="follow-icon" aria-hidden="true">
                      {channel.icon}
                    </span>
                    <h2>{channel.name}</h2>
                  </div>
                  <p>{channel.description}</p>
                  <a href={channel.href} target="_blank" rel="noopener noreferrer">
                    Follow on {channel.name}
                  </a>
                </article>
              ))}
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default FollowPage;
