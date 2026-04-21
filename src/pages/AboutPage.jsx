import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const AboutPage = ({ currentUser, onLogout }) => {
  return (
    <div className="about-page">
      <SiteHeader currentUser={currentUser} onLogout={onLogout} />

      <main>
        <section className="about-hero">
          <h1>Sport doesn't stop when you travel. Neither should you.</h1>
          <p className="about-hero-sub">
            SharedXP connects sports-loving travelers with local people who share their passion — their
            knowledge, their routes, and their gear.
          </p>
          <img
            className="about-hero-img"
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80"
            alt="Travelers enjoying outdoor sport activity"
          />
        </section>

        <section className="about-story">
          <p className="about-label">Our story</p>
          <h2>It started with a problem.</h2>
          <p>
            Alp Capa is a triathlete. Cycling, running, swimming — and mountain biking above all. But every time
            he travelled for work or pleasure, the same thing happened: the bike stayed home. Or he didn’t feel
            safe to explore new trails alone. The sports that define his daily life were impossible to keep up on
            the road.
          </p>
          <p>
            He wasn't alone. Millions of active people travel every year and quietly give up the thing they love
            most — because carrying equipment is a hassle, because they don't know the local routes, and because
            doing sport alone in a new city isn't the same as doing it with someone who knows the place.
          </p>
          <p>
            So he built SharedXP. Not a gear rental app. Not a tourist activity platform. Something more human
            than that — a way to find the person in Lisbon who cycles the waterfront every Saturday morning, the
            tennis player in Barcelona who's always looking for a hitting partner, the runner in Berlin who knows
            every trail through Tiergarten. People who do what you do, where you are, and who are happy to share
            it.
          </p>

          <figure className="about-founder">
            <img
              className="about-founder-photo"
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80"
              alt="Alp R. Capa"
            />
            <figcaption>
              <p className="about-founder-name">Alp R. Capa</p>
              <p className="about-founder-title">Founder &amp; CEO, SharedXP</p>
            </figcaption>
          </figure>
        </section>

        <section className="about-split">
          <p className="about-label">Who it's for</p>
          <h2>Built for two kinds of people.</h2>
          <div className="about-split-grid">
            <article className="about-split-card">
              <span className="about-card-icon" aria-hidden="true">
                ✈️
              </span>
              <h3>For Travelers</h3>
              <p>
                You find a local who does your sport at your level. You book a session, show up, and play. No
                gear to carry. No guesswork about where to go. Just your sport, in a new city, with someone who
                makes it feel like home.
              </p>
              <Link to="/locals" className="about-split-link">
                Find a local →
              </Link>
            </article>

            <article className="about-split-card">
              <span className="about-card-icon" aria-hidden="true">
                🏅
              </span>
              <h3>For Hosts</h3>
              <p>
                You do what you already love — and earn from it. Share your routes, your court time, your local
                knowledge. Meet interesting people from around the world. Every session is a chance to connect,
                and every booking puts money in your pocket for something you'd be doing anyway.
              </p>
              <Link to="/become-a-host" className="about-split-link">
                Become a host →
              </Link>
            </article>
          </div>
        </section>

        <section className="about-values">
          <p className="about-label">What we believe</p>
          <h2>Our values.</h2>
          <div className="about-values-grid">
            <article className="about-value-card">
              <span className="about-card-icon" aria-hidden="true">
                🌍
              </span>
              <h3>Local knowledge, not tourist traps</h3>
              <p>
                Every host is a real local who knows their sport and their city. You get routes, spots, and tips
                you'd never find on a travel blog.
              </p>
            </article>
            <article className="about-value-card">
              <span className="about-card-icon" aria-hidden="true">
                🤝
              </span>
              <h3>Trust built into every session</h3>
              <p>
                Verified profiles, structured reviews, and secure payments mean both sides are protected —
                before, during, and after every experience.
              </p>
            </article>
            <article className="about-value-card">
              <span className="about-card-icon" aria-hidden="true">
                🏅
              </span>
              <h3>Every sport, every level</h3>
              <p>
                Cycling, tennis, running, surfing, football, basketball — and more. Whether you're a beginner or
                a seasoned athlete, there's a local who matches your pace.
              </p>
            </article>
          </div>
        </section>

        <section className="about-cta">
          <div className="about-cta-grid">
            <div className="about-cta-block">
              <h3>Ready to play?</h3>
              <p>Find a local sports buddy at your next destination.</p>
              <Link to="/locals" className="btn btn-primary about-cta-btn">
                Explore locals
              </Link>
            </div>
            <div className="about-cta-block">
              <h3>Love your sport? Share it.</h3>
              <p>Turn what you already do into an experience worth booking.</p>
              <Link to="/become-a-host" className="btn btn-primary about-cta-btn">
                Become a host
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AboutPage;
