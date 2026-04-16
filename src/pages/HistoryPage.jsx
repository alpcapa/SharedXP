import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const HistoryPage = ({ currentUser, onLogout }) => {
  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to view your experience history.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const items = currentUser.history ?? [];

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page">
          <h1>History</h1>
          {items.length ? (
            <ul className="simple-list">
              {items.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No completed experiences yet.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default HistoryPage;
