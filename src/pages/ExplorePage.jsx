import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { supabase } from "../lib/supabase";

const EXPLORE_HOSTS_PER_PAGE = 12;
const GENDER_OPTIONS = ["All Hosts", "Male Hosts", "Female Hosts"];

const ExplorePage = ({ currentUser, onLogout }) => {
  const [searchParams] = useSearchParams();
  const [hosts, setHosts] = useState([]);
  const [hostsLoading, setHostsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All Hosts");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedEquipment, setSelectedEquipment] = useState("All");
  const [resultsPage, setResultsPage] = useState(1);

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
          console.error("[explore] Failed to fetch hosts:", error);
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

  const levelOptions = useMemo(
    () => [
      "All",
      ...[...new Set(hosts.flatMap((h) => h.sports.map((s) => s.level)).filter(Boolean))].sort()
    ],
    [hosts]
  );

  useEffect(() => {
    if (selectedCity !== "All" && !cityOptions.includes(selectedCity)) {
      setSelectedCity("All");
    }
  }, [cityOptions, selectedCity]);

  useEffect(() => {
    const sportParam = searchParams.get("sport");
    if (!sportParam) return;
    const match = sportOptions.find((s) => s.toLowerCase() === sportParam.toLowerCase());
    if (match) setSelectedSport(match);
  }, [searchParams, sportOptions]);

  const visibleHosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return hosts.filter((host) => {
      const matchesName = !query || host.name.toLowerCase().includes(query);
      const matchesCountry = selectedCountry === "All" || host.country === selectedCountry;
      const matchesCity = selectedCity === "All" || host.city === selectedCity;
      const matchesSport =
        selectedSport === "All" || host.sports.some((s) => s.sport === selectedSport);
      const genderValue =
        selectedGender === "Male Hosts"
          ? "Male"
          : selectedGender === "Female Hosts"
            ? "Female"
            : null;
      const matchesGender = !genderValue || host.gender === genderValue;
      const matchesLevel =
        selectedLevel === "All" || host.sports.some((s) => s.level === selectedLevel);
      const matchesEquipment =
        selectedEquipment === "All" ||
        (selectedEquipment === "Yes" && host.sports.some((s) => s.equipment_available)) ||
        (selectedEquipment === "No" && !host.sports.some((s) => s.equipment_available));

      return (
        matchesName &&
        matchesCountry &&
        matchesCity &&
        matchesSport &&
        matchesGender &&
        matchesLevel &&
        matchesEquipment
      );
    });
  }, [
    hosts,
    searchQuery,
    selectedCountry,
    selectedCity,
    selectedSport,
    selectedGender,
    selectedLevel,
    selectedEquipment
  ]);

  useEffect(() => {
    setResultsPage(1);
  }, [
    searchQuery,
    selectedCountry,
    selectedCity,
    selectedSport,
    selectedGender,
    selectedLevel,
    selectedEquipment
  ]);

  const totalResultsPages = Math.max(1, Math.ceil(visibleHosts.length / EXPLORE_HOSTS_PER_PAGE));

  const pagedHosts = useMemo(() => {
    const start = (resultsPage - 1) * EXPLORE_HOSTS_PER_PAGE;
    return visibleHosts.slice(start, start + EXPLORE_HOSTS_PER_PAGE);
  }, [resultsPage, visibleHosts]);

  useEffect(() => {
    if (resultsPage > totalResultsPages) {
      setResultsPage(totalResultsPages);
    }
  }, [resultsPage, totalResultsPages]);

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="explore-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          <div className="explore-hero-content">
            <h1>
              Find your Host<span className="accent">.</span>
            </h1>
            <p>Search and filter hosts by location, sport, gender, level, and equipment.</p>
            <section className="explore-filters">
              <div className="explore-filter-search">
                <label htmlFor="explore-search">Search</label>
                <input
                  id="explore-search"
                  type="search"
                  className="explore-search-input"
                  placeholder="Search by host name"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search hosts by name"
                />
              </div>
              <div className="explore-filter-dropdowns">
                <div className="explore-filter-group">
                  <label htmlFor="filter-country">Country</label>
                  <select
                    id="filter-country"
                    value={selectedCountry}
                    onChange={(event) => {
                      setSelectedCountry(event.target.value);
                      setSelectedCity("All");
                    }}
                  >
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c === "All" ? "All Countries" : c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="explore-filter-group">
                  <label htmlFor="filter-city">City</label>
                  <select
                    id="filter-city"
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                    disabled={cityOptions.length <= 1}
                  >
                    {cityOptions.map((c) => (
                      <option key={c} value={c}>
                        {c === "All" ? "All Cities" : c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="explore-filter-group">
                  <label htmlFor="filter-sport">Sport</label>
                  <select
                    id="filter-sport"
                    value={selectedSport}
                    onChange={(event) => setSelectedSport(event.target.value)}
                  >
                    {sportOptions.map((s) => (
                      <option key={s} value={s}>
                        {s === "All" ? "All Sports" : s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="explore-filter-group">
                  <label htmlFor="filter-gender">Gender</label>
                  <select
                    id="filter-gender"
                    value={selectedGender}
                    onChange={(event) => setSelectedGender(event.target.value)}
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="explore-filter-group">
                  <label htmlFor="filter-level">Level</label>
                  <select
                    id="filter-level"
                    value={selectedLevel}
                    onChange={(event) => setSelectedLevel(event.target.value)}
                  >
                    {levelOptions.map((l) => (
                      <option key={l} value={l}>
                        {l === "All" ? "All Levels" : l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="explore-filter-group">
                  <label htmlFor="filter-equipment">Equipment</label>
                  <select
                    id="filter-equipment"
                    value={selectedEquipment}
                    onChange={(event) => setSelectedEquipment(event.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </section>

        <main className="middle-section explore-page-content">
          <section className="locals-section">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  {hostsLoading ? "Loading hosts…" : `Hosts (${visibleHosts.length})`}
                </h2>
                <p className="section-sub">Browse and discover hosts near you.</p>
              </div>
            </div>

            {hostsLoading ? (
              <p className="explore-loading">Loading hosts…</p>
            ) : visibleHosts.length === 0 ? (
              <p className="explore-empty">No hosts found matching your filters.</p>
            ) : (
              <div className="locals-grid">
                {pagedHosts.map((host) => {
                  const locationLine = [host.city, host.country].filter(Boolean).join(", ");
                  const hasEquipment = host.sports.some((s) => s.equipment_available);
                  return (
                    <Link to={`/buddy/${host.userId}`} key={host.id} className="local-card-link">
                      <article className="local-card">
                        <div className="local-image-wrap">
                          {host.photo ? (
                            <img src={host.photo} alt={host.name} />
                          ) : (
                            <div className="local-image-placeholder">👤</div>
                          )}
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
                            {(() => {
                              const levels = [...new Set(host.sports.map((s) => s.level).filter(Boolean))];
                              return levels.length > 0 && <li>🏅 {levels.join(", ")}</li>;
                            })()}
                            <li>🎒 Equipment: {hasEquipment ? "Yes" : "No"}</li>
                          </ul>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            )}

            {!hostsLoading && visibleHosts.length > EXPLORE_HOSTS_PER_PAGE && (
              <div className="locals-pagination" aria-label="Explore results pagination">
                <button
                  type="button"
                  className="locals-pagination-button"
                  onClick={() => setResultsPage((page) => Math.max(page - 1, 1))}
                  disabled={resultsPage === 1}
                >
                  Previous
                </button>
                <p className="locals-pagination-status">
                  Page {resultsPage} of {totalResultsPages}
                </p>
                <button
                  type="button"
                  className="locals-pagination-button"
                  onClick={() => setResultsPage((page) => Math.min(page + 1, totalResultsPages))}
                  disabled={resultsPage >= totalResultsPages}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default ExplorePage;
