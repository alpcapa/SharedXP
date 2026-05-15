import { Link } from "react-router-dom";
import { CURRENCY_SYMBOLS } from "../utils/pricing";

const BuddyCard = ({ buddy }) => {
  const actionLabel = buddy.sport === "Cycling" ? "Ride with" : "Play with";
  const hasEquipment = buddy.equipmentAvailable ?? buddy.bikeAvailable;
  const currency = String(buddy.pricingCurrency ?? "EUR").toUpperCase();
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const price = Number(buddy.price ?? buddy.pricing ?? 0);

  return (
    <Link to={`/user/${buddy.id}`} className="card-link">
      <div className="card">
        <img src={buddy.image} alt={buddy.name} />
        <h3>{buddy.name}</h3>
        {buddy.bio && <p>{buddy.bio}</p>}
        <p>{hasEquipment ? "🧰 Equipment available" : "🧰 Equipment not available"}</p>
        {buddy.rating != null && <p>⭐ {buddy.rating}</p>}
        {price > 0 && <p className="price">{currencySymbol}{price}</p>}
        <span className="card-cta">
          {actionLabel} {buddy.name}
        </span>
      </div>
    </Link>
  );
};

export default BuddyCard;
