import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { fieldPosts } from "../data/fieldPosts";
import { supabase } from "../lib/supabase";

const featuredStatuses = ["Online", "New", "Online", "Online"];
const LOCALS_PER_PAGE = 4;
const FIELD_PER_PAGE = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getRelativePostedLabel = (postedAt) => {
  const postDate = new Date(postedAt);
  if (Number.isNaN(postDate.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  postDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((today.getTime() - postDate.getTime()) / MS_PER_DAY);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff} days ago`;
};

const sortedFieldPosts = [...fieldPosts].sort(
  (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const steps = [
  {
    stepNum: 1,
    title: "1. Find a buddy",
    text: "Browse locals by sport, location, and vibe.",
    img: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=500&h=220&q=80"
  },
  {
    stepNum: 2,
    title: "2. Request & book",
    text: "Chat, agree on details, and book securely.",
    img: "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=500&h=220&q=80"
  },
  {
    stepNum: 3,
    title: "3. Meet & play",
    text: "Have an amazing time. We handle the payment.",
    img: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=500&h=220&q=80"
  }
];

const currentDate = new Date();
const DEFAULT_MONTH = currentDate.getMonth() + 1; // 1-12
const DEFAULT_YEAR = currentDate.getFullYear();
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => DEFAULT_YEAR + i);

const LockIcon = () => (
  <svg
    className="lock-icon"
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    aria-hidden="true"
  >
    <rect x="12" y="34" width="48" height="30" rx="7" stroke="#6ca43b" strokeWidth="3" />
    <path
      d="M24 34V24a12 12 0 0124 0v10"
      stroke="#6ca43b"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="36" cy="49" r="4" fill="#6ca43b" />
    <line x1="36" y1="53" x2="36" y2="58" stroke="#6ca43b" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const HomePage = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState([]);
  const [hostsLoading, setHostsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [localsPage, setLocalsPage] = useState(0);
  const [fieldPage, setFieldPage] = useState(0);
  const searchBarRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setHostsLoading(true);

    supabase
      .from("host_profiles")
      .select(
        `id, country, city, pause_hosting,
         profile:profiles!user_id(id, full_name, first_name, last_name, photo_url, gender, signed_up_at),
         host_sports(id, sport, level, equipment_available, paused)`
      )
      .eq("pause_hosting", false)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[home] Failed to fetch hosts:", error);
          setHosts([]);
        } else {
          const transformed = (data || [])
            .filter((hp) => hp.profile && (hp.host_sports || []).some((hs) => !hs.paused))
            .map((hp) => ({
              id: hp.id,
              userId: hp.profile.id,
              name:
                hp.profile.full_name ||
                [hp.profile.first_name, hp.profile.last_name].filter(Boolean).join(" ") ||
                "Host",
              photo: hp.profile.photo_url || "",
              gender: hp.profile.gender || "",
              country: hp.country || "",
              city: hp.city || "",
              signedUpAt: hp.profile.signed_up_at || "",
              sports: (hp.host_sports || []).filter((hs) => !hs.paused)
            }));
          setHosts(transformed);
        }
        setHostsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const countryOptions = useMemo(
    () => ["All", ...[...new Set(hosts.map((h) => h.country).filter(Boolean))].sort()],
    [hosts]
  );

  const cityOptions = useMemo(() => {
    const hostsForCountry =
      selectedCountry === "All" ? hosts : hosts.filter((h) => h.country === selectedCountry);
    return ["All", ...[...new Set(hostsForCountry.map((h) => h.city).filter(Boolean))].sort()];
  }, [hosts, selectedCountry]);

  const sportOptions = useMemo(
    () => [
      "All",
      ...[...new Set(hosts.flatMap((h) => h.sports.map((s) => s.sport)).filter(Boolean))].sort()
    ],
    [hosts]
  );

  useEffect(() => {
    if (selectedCity !== "All" && !cityOptions.includes(selectedCity)) {
      setSelectedCity("All");
    }
  }, [cityOptions, selectedCity]);

  const filteredHosts = useMemo(() => {
    return hosts.filter((host) => {
      const matchesCountry = selectedCountry === "All" || host.country === selectedCountry;
      const matchesCity = selectedCity === "All" || host.city === selectedCity;
      const matchesSport =
        selectedSport === "All" || host.sports.some((s) => s.sport === selectedSport);
      return matchesCountry && matchesCity && matchesSport;
    });
  }, [hosts, selectedCountry, selectedCity, selectedSport]);

  useEffect(() => {
    setLocalsPage(0);
  }, [selectedCountry, selectedCity, selectedSport]);

  const totalLocalsPages = Math.max(1, Math.ceil(filteredHosts.length / LOCALS_PER_PAGE));
  const featuredLocals = useMemo(() => {
    const startIndex = localsPage * LOCALS_PER_PAGE;
    return filteredHosts.slice(startIndex, startIndex + LOCALS_PER_PAGE);
  }, [localsPage, filteredHosts]);

  const totalFieldPages = Math.max(1, Math.ceil(sortedFieldPosts.length / FIELD_PER_PAGE));
  const visibleFieldPosts = useMemo(() => {
    const start = fieldPage * FIELD_PER_PAGE;
    return sortedFieldPosts.slice(start, start + FIELD_PER_PAGE);
  }, [fieldPage]);

  const localsHeadingLocation = useMemo(() => {
    if (selectedCity !== "All") return selectedCity;
    if (selectedCountry !== "All") return selectedCountry;
    return "the world";
  }, [selectedCity, selectedCountry]);

  const handleFindBuddies = () => {
    const params = new URLSearchParams();

    if (selectedCountry !== "All") {
      params.set("country", selectedCountry);
    }
    if (selectedCity !== "All") {
      params.set("city", selectedCity);
    }
    if (selectedSport !== "All") {
      params.set("sport", selectedSport);
    }

    navigate(`/locals?${params.toString()}`);
  };

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          <div className="hero-content">
            <h1>
              Find your sports buddy<span className="dot">.</span>
              <br />
              Anywhere<span className="accent">.</span>
            </h1>
            <p>Join locals and travelers for unforgettable sports experiences.</p>
            <div className="search-bar" role="search" aria-label="Find sports buddies" ref={searchBarRef}>
              <div className="search-field">
                <label htmlFor="filter-home-country">Select Country</label>
                <select
                  id="filter-home-country"
                  value={selectedCountry}
                  onChange={(event) => {
                    setSelectedCountry(event.target.value);
                    setSelectedCity("All");
                  }}
                >
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="filter-home-city">Select City</label>
                <select
                  id="filter-home-city"
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                  disabled={cityOptions.length <= 1}
                >
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="filter-home-sport">Select Sport</label>
                <select
                  id="filter-home-sport"
                  value={selectedSport}
                  onChange={(event) => setSelectedSport(event.target.value)}
                >
                  {sportOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="filter-home-month">When</label>
                <div className="when-selects">
                  <select
                    id="filter-home-month"
                    aria-label="Month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(Number(event.target.value))}
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Year"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                  >
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="find-button"
                aria-label="Find buddies"
                onClick={handleFindBuddies}
              >
                Find Buddies
              </button>
            </div>
          </div>
        </section>

        <main className="middle-section">
          {/* ── Locals ───────────────────────────────────────── */}
          <section className="locals-section" id="locals">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  Locals ready to play in {localsHeadingLocation}
                </h2>
                <p className="section-sub">
                  Sports buddies near you. Real people. Real connections.
                </p>
              </div>
              <Link to="/locals" className="view-all-link">
                View all
              </Link>
            </div>

            <div className="locals-grid-wrap">
              {hostsLoading ? (
                <p className="explore-loading">Loading locals…</p>
              ) : filteredHosts.length === 0 ? (
                <p className="explore-empty">No locals found matching your filters.</p>
              ) : (
                <div className="locals-grid">
                          {featuredLocals.map((host, index) => {
                    const statusIndex =
                      (localsPage * LOCALS_PER_PAGE + index) % featuredStatuses.length;
                    const locationLine = [host.city, host.country].filter(Boolean).join(", ");
                    const hasEquipment = host.sports.some((s) => s.equipment_available);
                    const levels = [
                      ...new Set(host.sports.map((s) => s.level).filter(Boolean))
                    ];
                    return (
                      <Link to={`/buddy/${host.userId}`} key={host.id} className="local-card-link">
                        <article className="local-card">
                          <div className="local-image-wrap">
                            {host.photo ? (
                              <img src={host.photo} alt={host.name} />
                            ) : (
                              <div className="local-image-placeholder">👤</div>
                            )}
                            <span className="status-badge">
                              <span className="status-dot" />
                              {featuredStatuses[statusIndex]}
                            </span>
                          </div>
                          <div className="local-body">
                            <div className="local-title-row">
                              <h3>{host.name}</h3>
                            </div>
                            {locationLine && (
                              <p className="local-location">📍 {locationLine}</p>
                            )}
                            <div className="local-sport-pills">
                              {host.sports.slice(0, 3).map((s) => (
                                <span key={s.id} className="sport-pill">
                                  {s.sport}
                                </span>
                              ))}
                            </div>
                            <ul className="local-meta">
                              {host.gender && <li>👤 {host.gender}</li>}
                              {levels.length > 0 && <li>🏅 {levels.join(", ")}</li>}
                              <li>🎒 Equipment: {hasEquipment ? "Yes" : "No"}</li>
                            </ul>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              )}
              {!hostsLoading && filteredHosts.length > 0 && (
                <div className="locals-nav-row">
                  <button
                    type="button"
                    className="locals-nav"
                    aria-label="Show previous 4 locals"
                    onClick={() => setLocalsPage((page) => Math.max(page - 1, 0))}
                    disabled={localsPage === 0}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="locals-nav"
                    aria-label="Show next 4 locals"
                    onClick={() =>
                      setLocalsPage((page) => Math.min(page + 1, totalLocalsPages - 1))
                    }
                    disabled={localsPage >= totalLocalsPages - 1}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── The Field ────────────────────────────────────── */}
          <section className="field-home-section">
            <div className="section-head">
              <div>
                <h2 className="section-title">What's happening on the Field?</h2>
                <p className="section-sub">Real sessions. Real people.</p>
              </div>
              <Link to="/the-field" className="view-all-link">View all</Link>
            </div>
            <div className="field-feed">
              {visibleFieldPosts.map((post) => (
                <article key={post.id} className="field-card">
                  <div className="field-host-row">
                    {post.hostPhoto ? (
                      <img src={post.hostPhoto} alt={post.hostName} className="field-host-avatar" />
                    ) : (
                      <div className="field-host-avatar field-host-avatar-fallback" aria-hidden="true">
                        {String(post.hostName ?? "?").trim().split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"}
                      </div>
                    )}
                    <div>
                      <p>
                        <span className="field-host-name">{post.hostName}</span>
                        <span className="field-host-city"> · {post.city}</span>
                      </p>
                      <span className="sport-pill">{post.sport}</span>
                    </div>
                  </div>
                  {post.photo && (
                    <img src={post.photo} alt={post.sport} className="field-post-photo" />
                  )}
                  <p className="field-caption">{post.caption}</p>
                  <p className="field-meta">🤍 {post.likes} · {getRelativePostedLabel(post.postedAt)}</p>
                </article>
              ))}
            </div>
            <div className="locals-nav-row">
              <button
                type="button"
                className="locals-nav"
                aria-label="Show previous field posts"
                onClick={() => setFieldPage((p) => Math.max(p - 1, 0))}
                disabled={fieldPage === 0}
              >
                ‹
              </button>
              <button
                type="button"
                className="locals-nav"
                aria-label="Show next field posts"
                onClick={() => setFieldPage((p) => Math.min(p + 1, totalFieldPages - 1))}
                disabled={fieldPage >= totalFieldPages - 1}
              >
                ›
              </button>
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────── */}
          <section className="how-section">
            <h2 className="section-title">How it works</h2>
            <p className="section-sub">Simple steps to connect and play.</p>
            <div className="how-grid">
              {steps.map((step) => (
                <article key={step.title} className="how-card">
                  <div className="how-step-img-wrap">
                    <img src={step.img} alt="" className="how-step-img" />
                    <span className="step-badge">{step.stepNum}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
              <article className="how-card how-highlight">
                <div className="how-highlight-body">
                  <h3>Fair payments, every time</h3>
                  <p>
                    You pay when you book. We hold the payment and release it after the
                    experience.
                  </p>
                  <Link to="/about" className="learn-more-link">
                    Learn more
                  </Link>
                </div>
                <LockIcon />
              </article>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default HomePage;
