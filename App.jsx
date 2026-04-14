import { useState } from "react";
import { buddies } from "./data/buddies";
import BuddyCard from "./components/BuddyCard";

function App() {
  const [sport, setSport] = useState("Cycling");

  const filtered =
    sport === "All"
      ? buddies
      : buddies.filter((b) => b.sport === sport);

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
        {["Cycling", "Tennis", "All"].map((s) => (
          <button key={s} onClick={() => setSport(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid">
        {filtered.map((b) => (
          <BuddyCard key={b.id} buddy={b} />
        ))}
      </div>
    </div>
  );
}

export default App;
