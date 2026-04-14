import { Link } from "react-router-dom";

const SiteHeader = () => {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        Shared<span>XP</span>
      </Link>

      <nav className="site-nav">
        <Link to="/">Explore</Link>
        <a href="#">Messages</a>
        <a href="#">Become a Host</a>
        <a href="#">How it works</a>
      </nav>

      <div className="auth-actions">
        <button type="button" className="btn btn-light">
          Log in
        </button>
        <button type="button" className="btn btn-primary">
          Sign up
        </button>
      </div>
    </header>
  );
};

export default SiteHeader;
