import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const HostPage = ({ currentUser, onLogout, onToggleHost }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHostSettingsRoute = location.pathname === "/host-settings";

  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in before becoming a host.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const heading = currentUser.isHost || isHostSettingsRoute ? "Host Settings" : "Become A Host";

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page">
          <h1>{heading}</h1>
          {currentUser.isHost ? (
            <>
              <p>You are listed as a host. Manage your hosting preferences here.</p>
              <ul className="simple-list">
                <li>Update availability and pricing</li>
                <li>Manage your sports and equipment</li>
                <li>Review booking requests</li>
              </ul>
            </>
          ) : (
            <>
              <p>Start hosting experiences and earn from your sport expertise.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onToggleHost?.();
                  navigate("/host-settings");
                }}
              >
                Activate Host Profile
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default HostPage;
