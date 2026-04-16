import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const createInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

const sanitizeInitials = (initials) => initials.replace(/[^A-Z0-9]/g, "").slice(0, 2) || "U";

const SiteHeader = ({ currentUser, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isLoggedIn = Boolean(currentUser);
  const hostRoute = currentUser?.isHost ? "/host-settings" : "/become-a-host";
  const hostLabel = currentUser?.isHost ? "Host Settings" : "Become A Host";
  const navHostRoute = isLoggedIn ? hostRoute : "/become-a-host";
  const navHostLabel = isLoggedIn ? hostLabel : "Become a Host";

  const fallbackPhoto = useMemo(() => {
    if (!currentUser?.fullName) {
      return "";
    }

    const initials = sanitizeInitials(createInitials(currentUser.fullName));
    return `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${initials}">
        <rect width="100" height="100" rx="50" fill="#96c93d" />
        <text x="50" y="58" text-anchor="middle" font-size="34" fill="#ffffff" font-family="Arial, sans-serif">${initials}</text>
      </svg>`
    )}`;
  }, [currentUser?.fullName]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        Shared<span>XP</span>
      </Link>

      <nav className="site-nav">
        <Link to="/" className="site-nav-link">
          Explore
        </Link>
        <button type="button" className="nav-link-button">
          Messages
        </button>
        <Link to={navHostRoute} className="site-nav-link">
          {navHostLabel}
        </Link>
        <Link to="/how-it-works" className="site-nav-link">
          How it works
        </Link>
      </nav>

      {isLoggedIn ? (
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="avatar-button"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Open account menu"
            onClick={() => setIsMenuOpen((currentState) => !currentState)}
          >
            <img
              src={currentUser.photo || fallbackPhoto}
              alt={currentUser.fullName}
              className="avatar-thumbnail"
            />
          </button>

          {isMenuOpen && (
            <div className="user-dropdown" role="menu">
              <p className="user-dropdown-name">{currentUser.fullName}</p>
              <Link to="/my-profile" className="user-dropdown-link" role="menuitem">
                My Profile
              </Link>
              <Link to={hostRoute} className="user-dropdown-link" role="menuitem">
                {hostLabel}
              </Link>
              <Link to="/history" className="user-dropdown-link" role="menuitem">
                History
              </Link>
              <button
                type="button"
                className="user-dropdown-link user-dropdown-logout"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout?.();
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="auth-actions">
          <Link to="/login" className="btn btn-light auth-link">
            Log in
          </Link>
          <Link to="/signup" className="btn btn-primary auth-link">
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
