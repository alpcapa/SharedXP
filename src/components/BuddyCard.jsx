import { Link } from "react-router-dom";

const BuddyCard = ({ buddy }) => {
  return (
    <Link to={`/buddy/${buddy.id}`} className="card-link">
      <div className="card">
        <img src={buddy.image} alt={buddy.name} />
        <h3>{buddy.name}</h3>
        <p>{buddy.bio}</p>
        <p>{buddy.bikeAvailable ? "🚲 Bike available" : ""}</p>
        <p>⭐ {buddy.rating}</p>
        <p className="price">€{buddy.price}</p>
        <span className="card-cta">Ride with {buddy.name}</span>
      </div>
    </Link>
  );
};

export default BuddyCard;
