const BuddyCard = ({ buddy }) => {
  return (
    <div className="card">
      <img src={buddy.image} />
      <h3>{buddy.name}</h3>
      <p>{buddy.bio}</p>
      <p>{buddy.bikeAvailable ? "🚲 Bike available" : ""}</p>
      <p>⭐ {buddy.rating}</p>
      <p className="price">€{buddy.price}</p>
      <button onClick={() => alert("Request sent!")}>
        Ride with {buddy.name}
      </button>
    </div>
  );
};

export default BuddyCard;
