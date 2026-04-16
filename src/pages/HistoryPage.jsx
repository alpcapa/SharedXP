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
  const occurrenceMap = {};
  const normalizedItems = items.map((item) => {
    let label = "";
    let providedId = "";

    if (item && typeof item === "object") {
      label = item.label ?? item.title ?? "Experience";
      providedId = item.id ?? "";
    } else {
      label = String(item);
    }

    occurrenceMap[label] = (occurrenceMap[label] ?? 0) + 1;
    return {
      id: providedId || `${label}-${occurrenceMap[label]}`,
      label
    };
  });

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page">
          <h1>History</h1>
          {normalizedItems.length ? (
            <ul className="simple-list">
              {normalizedItems.map((item) => (
                <li key={item.id}>{item.label}</li>
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
