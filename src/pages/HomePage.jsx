import { useState } from "react";
import BuddyCard from "../components/BuddyCard";
import { buddies } from "../data/buddies";

const sports = ["Cycling", "Tennis", "All"];

const HomePage = () => {
  const [sport, setSport] = useState("Cycling");
  const filtered =
    sport === "All" ? buddies : buddies.filter((buddy) => buddy.sport === sport);

  return (
    <div>
      <header className="navbar">
        <h2>SharedXP</h2>
      </header>

      <section className="hero">
        <h1>Find your sports buddy. Anywhere.</h1>
        <p>Connect with locals and play together.</p>
      </section>

      <div className="filters">
        {sports.map((name) => (
          <button
            key={name}
            onClick={() => setSport(name)}
            className={sport === name ? "active-filter" : ""}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid">
        {filtered.map((buddy) => (
          <BuddyCard key={buddy.id} buddy={buddy} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
