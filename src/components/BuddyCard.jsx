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
        <button type="button">Ride with {buddy.name}</button>
      </div>
    </Link>
  );
};

export default BuddyCard;
