import { Link } from "react-router-dom";
import { CURRENCY_SYMBOLS } from "../utils/pricing";

const BuddyCard = ({ buddy }) => {
  const currency = String(buddy.pricingCurrency ?? "EUR").toUpperCase();
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const price = Number(buddy.price ?? buddy.pricing ?? 0);
  const hasEquipment = buddy.equipmentAvailable ?? buddy.bikeAvailable;
  const locationLine = [buddy.city, buddy.country].filter(Boolean).join(", ");
  const initials = buddy.name.trim().split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

  return (
    <Link to={`/user/${buddy.id}`} className="local-card-link">
      <article className="field-card">
        <div className="field-host-row">
          {buddy.image ? (
            <img src={buddy.image} alt={buddy.name} className="field-host-avatar" />
          ) : (
            <div className="field-host-avatar field-host-avatar-fallback">{initials}</div>
          )}
          <div>
            <p>
              <span className="field-host-name">{buddy.name}</span>
              {locationLine && <span className="field-host-city"> · {locationLine}</span>}
            </p>
            <div className="local-sport-pills">
              {buddy.sport && <span className="sport-pill">{buddy.sport}</span>}
            </div>
          </div>
        </div>
        {buddy.image ? (
          <img src={buddy.image} alt={buddy.name} className="field-post-photo" />
        ) : (
          <div className="field-post-photo-placeholder" />
        )}
        <p className="field-meta">
          {[
            buddy.level && `🏅 ${buddy.level}`,
            `🎒 ${hasEquipment ? "Yes" : "No"}`,
            price > 0 && `${currencySymbol}${price}`,
          ].filter(Boolean).join(" · ")}
        </p>
      </article>
    </Link>
  );
};

export default BuddyCard;
