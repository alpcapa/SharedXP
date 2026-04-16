import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const MyProfilePage = ({ currentUser, onLogout }) => {
  if (!currentUser) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero">
            <SiteHeader />
          </section>
          <main className="middle-section simple-page">
            <h1>Please log in</h1>
            <p>You need to log in to see your profile.</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>
        <main className="middle-section simple-page">
          <h1>My Profile</h1>
          <img src={currentUser.photo} alt={currentUser.fullName} className="profile-thumbnail-large" />
          <ul className="simple-list">
            <li>
              <strong>Name:</strong> {currentUser.fullName}
            </li>
            <li>
              <strong>Email:</strong> {currentUser.email}
            </li>
            <li>
              <strong>Phone:</strong> {currentUser.phone || "Not provided"}
            </li>
            <li>
              <strong>Address:</strong> {currentUser.address || "Not provided"}
            </li>
          </ul>
        </main>
      </div>
    </div>
  );
};

export default MyProfilePage;
