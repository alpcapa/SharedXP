import { Link, useParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const ProfilePage = () => {
  const { buddyId } = useParams();
  const buddy = buddies.find((item) => String(item.id) === buddyId);

  if (!buddy) {
    return (
      <div className="profile-page">
        <p>Buddy not found.</p>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const recommendations = buddies.filter((item) => item.id !== buddy.id).slice(0, 2);
  const perLabel = buddy.sport === "Cycling" ? "per ride" : "per session";
  const requestLabel =
    buddy.sport === "Cycling" ? "Request a Ride" : "Request a Session";

  return (
    <div className="profile-page">
      <SiteHeader />
      <div className="profile-back-wrap">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
      </div>

      <section className="profile-summary">
        <img src={buddy.image} alt={buddy.name} className="profile-main-image" />
        <div>
          <h1>{buddy.name}</h1>
          <p>
            ⭐ {buddy.rating} · <span className="verified">Verified</span>
          </p>
          <p>
            {buddy.location} · Member since {buddy.memberSince}
          </p>
          <p>{buddy.bio}</p>
          <p>Level: {buddy.level}</p>
          <p className="price">
            €{buddy.price} {perLabel}
          </p>
          <p>{buddy.availabilitySchedule.join(" · ")}</p>
          <button>{requestLabel}</button>
        </div>
      </section>

      <section className="gallery">
        <h3>Photo gallery</h3>
        <div className="gallery-grid">
          {buddy.gallery.map((photo) => (
            <img key={photo} src={photo} alt={`${buddy.name} gallery`} />
          ))}
        </div>
      </section>

      <section className="about">
        <h3>About</h3>
        <p>{buddy.about}</p>
        <p>
          Bike: {buddy.bike.brand} {buddy.bike.model} ({buddy.bike.type})
        </p>
      </section>

      <section className="reviews">
        <h3>Reviews</h3>
        {buddy.reviews.map((review) => (
          <article key={`${review.author}-${review.comment}`} className="review-card">
            <p>
              <strong>{review.author}</strong> · ⭐ {review.rating}
            </p>
            <p>{review.comment}</p>
          </article>
        ))}
      </section>

      <section>
        <h3>More locals you might like</h3>
        <div className="grid">
          {recommendations.map((recommendation) => (
            <BuddyCard key={recommendation.id} buddy={recommendation} />
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
};

export default ProfilePage;
