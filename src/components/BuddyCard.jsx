import { Link } from "react-router-dom";
import { getAgeFromBirthday } from "../utils/profileAge";

const BuddyCard = ({ buddy }) => {
  const locationLine = [buddy.city, buddy.country].filter(Boolean).join(", ");
  const initials = buddy.name.trim().split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

  const allSports = Array.isArray(buddy.sports) && buddy.sports.length > 0
    ? buddy.sports
    : buddy.sport ? [{ sport: buddy.sport, level: buddy.level, equipment_available: buddy.equipmentAvailable }] : [];

  const sportNames = allSports.map((s) => s.sport).filter(Boolean);
  const hasEquipment = allSports.some((s) => s.equipment_available);
  const levels = [...new Set(allSports.map((s) => s.level).filter(Boolean))];
  const age = getAgeFromBirthday(buddy.birthday);

  const meta = [
    (buddy.gender || age != null) && `👤 ${[buddy.gender, age].filter((v) => v != null && v !== "").join(", ")}`,
    levels.length > 0 && `🏅 ${levels.join(", ")}`,
    `🎒 ${hasEquipment ? "Yes" : "No"}`,
  ].filter(Boolean).join(" · ");

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
              {sportNames.slice(0, 3).map((s) => (
                <span key={s} className="sport-pill">{s}</span>
              ))}
            </div>
          </div>
        </div>
        {buddy.image ? (
          <img src={buddy.image} alt={buddy.name} className="field-post-photo" />
        ) : (
          <div className="field-post-photo-placeholder" />
        )}
        {meta && <p className="field-meta">{meta}</p>}
      </article>
    </Link>
  );
};

export default BuddyCard;
