import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const NotFoundPage = ({ currentUser, onLogout }) => (
  <div className="home-page">
    <div className="middle-page-frame">
      <section className="hero">
        <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        <div className="hero-content">
          <h1>
            Page not found<span className="dot">.</span>
          </h1>
          <p>The page you requested does not exist or has moved.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
            <Link to="/" className="find-button" style={{ textDecoration: "none" }}>
              Go home
            </Link>
            <Link to="/locals" className="find-button" style={{ textDecoration: "none" }}>
              Browse locals
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  </div>
);

export default NotFoundPage;
