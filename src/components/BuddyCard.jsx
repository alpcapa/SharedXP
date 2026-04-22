import { Link } from "react-router-dom";

const BuddyCard = ({ buddy }) => {
  const actionLabel = buddy.sport === "Cycling" ? "Ride with" : "Play with";
  const hasEquipment = buddy.equipmentAvailable;

  return (
    <Link to={`/buddy/${buddy.id}`} className="card-link">
      <div className="card">
        <img src={buddy.image} alt={buddy.name} />
        <h3>{buddy.name}</h3>
        <p>{buddy.bio}</p>
        <p>{hasEquipment ? "🧰 Equipment available" : "🧰 Equipment not available"}</p>
        <p>⭐ {buddy.rating}</p>
        <p className="price">€{buddy.price}</p>
        <span className="card-cta">
          {actionLabel} {buddy.name}
        </span>
      </div>
    </Link>
  );
};

export default BuddyCard;
