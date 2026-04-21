import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { buddies } from "../data/buddies";

const DEFAULT_CENTER = { lat: 38.7223, lng: -9.1393 };
const USER_LOCATION_FILTER = "Your location";
const EXPLORE_LOCALS_PER_PAGE = 12;

const SPORT_ICONS = {
  Cycling: "🚲",
  Tennis: "🎾",
  Running: "🏃",
  Football: "⚽",
  Surfing: "🏄",
  Basketball: "🏀"
};

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceKm = (origin, destination) => {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(destination.lat - origin.lat);
  const lngDiff = toRadians(destination.lng - origin.lng);
  const latOrigin = toRadians(origin.lat);
  const latDestination = toRadians(destination.lat);

  const haversineValue =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(latOrigin) *
      Math.cos(latDestination) *
      Math.sin(lngDiff / 2) *
      Math.sin(lngDiff / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
  return earthRadiusKm * angularDistance;
};

const calculateBounds = (points) => {
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);

  return {
    minLat: minLat - latSpan * 0.1,
    maxLat: maxLat + latSpan * 0.1,
    minLng: minLng - lngSpan * 0.1,
    maxLng: maxLng + lngSpan * 0.1
  };
};

const projectPoint = (point, bounds) => {
  const x = ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 100;

  return {
    x: Math.min(Math.max(x, 6), 94),
    y: Math.min(Math.max(y, 8), 92)
  };
};

const ExplorePage = ({ currentUser, onLogout }) => {
  const [searchParams] = useSearchParams();
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState(USER_LOCATION_FILTER);
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedEquipment, setSelectedEquipment] = useState("All");
  const [resultsPage, setResultsPage] = useState(1);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        setUserLocation(DEFAULT_CENTER);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  }, []);

  const sportOptions = useMemo(
    () => ["All", ...new Set(buddies.map((buddy) => buddy.sport).filter(Boolean))],
    [buddies]
  );
  const genderOptions = useMemo(
    () => ["All", ...new Set(buddies.map((buddy) => buddy.gender).filter(Boolean))],
    [buddies]
  );
  const locationOptions = useMemo(() => {
    const nearestDistanceByLocation = new Map();

    buddies.forEach((buddy) => {
      if (!buddy.location) {
        return;
      }

      const coordinates = buddy.coordinates ?? DEFAULT_CENTER;
      const distanceKm = getDistanceKm(userLocation, coordinates);
      const currentNearest = nearestDistanceByLocation.get(buddy.location);

      if (currentNearest === undefined || distanceKm < currentNearest) {
        nearestDistanceByLocation.set(buddy.location, distanceKm);
      }
    });

    const nearbyLocations = [...nearestDistanceByLocation.entries()]
      .sort((entryA, entryB) => entryA[1] - entryB[1])
      .map(([locationName]) => locationName);

    return [USER_LOCATION_FILTER, ...nearbyLocations];
  }, [userLocation, buddies]);
  const levelOptions = useMemo(
    () => ["All", ...new Set(buddies.map((buddy) => buddy.level).filter(Boolean))],
    [buddies]
  );

  useEffect(() => {
    const selectedSportParam = searchParams.get("sport");

    if (!selectedSportParam) {
      setSelectedSport("All");
      return;
    }

    const normalizedParam = selectedSportParam.toLowerCase();
    const matchingSport = sportOptions.find(
      (sportOption) => sportOption.toLowerCase() === normalizedParam
    );

    setSelectedSport(matchingSport ?? "All");
  }, [searchParams, sportOptions]);

  useEffect(() => {
    const selectedLocationParam = searchParams.get("location");

    if (!selectedLocationParam) {
      setSelectedLocation(USER_LOCATION_FILTER);
      return;
    }

    const normalizedParam = selectedLocationParam.toLowerCase();
    const matchingLocation = locationOptions.find(
      (locationOption) => locationOption.toLowerCase() === normalizedParam
    );

    setSelectedLocation(matchingLocation ?? USER_LOCATION_FILTER);
  }, [searchParams, locationOptions]);

  const visibleBuddies = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return buddies
      .map((buddy) => {
        const coordinates = buddy.coordinates ?? DEFAULT_CENTER;
        return {
          ...buddy,
          coordinates,
          distanceKm: getDistanceKm(userLocation, coordinates)
        };
      })
      .filter((buddy) => {
        const matchesQuery =
          !normalizedQuery ||
          [buddy.name, buddy.sport, buddy.location, buddy.level, buddy.bio]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery));
        const matchesSport = selectedSport === "All" || buddy.sport === selectedSport;
        const matchesLocation =
          selectedLocation === USER_LOCATION_FILTER || buddy.location === selectedLocation;
        const matchesGender = selectedGender === "All" || buddy.gender === selectedGender;
        const matchesLevel = selectedLevel === "All" || buddy.level === selectedLevel;
        const hasEquipment = buddy.equipmentAvailable ?? buddy.bikeAvailable;
        const matchesEquipment =
          selectedEquipment === "Yes"
            ? hasEquipment === true
            : selectedEquipment === "No"
              ? hasEquipment !== true
              : true;

        return (
          matchesQuery &&
          matchesSport &&
          matchesLocation &&
          matchesGender &&
          matchesLevel &&
          matchesEquipment
        );
      })
      .sort((leftBuddy, rightBuddy) => leftBuddy.distanceKm - rightBuddy.distanceKm);
  }, [
    searchQuery,
    selectedSport,
    selectedLocation,
    selectedGender,
    selectedLevel,
    selectedEquipment,
    userLocation
  ]);

  useEffect(() => {
    setResultsPage(1);
  }, [
    searchQuery,
    selectedSport,
    selectedLocation,
    selectedGender,
    selectedLevel,
    selectedEquipment
  ]);

  const totalResultsPages = Math.max(1, Math.ceil(visibleBuddies.length / EXPLORE_LOCALS_PER_PAGE));
  const pagedBuddies = useMemo(() => {
    const startIndex = (resultsPage - 1) * EXPLORE_LOCALS_PER_PAGE;
    return visibleBuddies.slice(startIndex, startIndex + EXPLORE_LOCALS_PER_PAGE);
  }, [resultsPage, visibleBuddies]);

  useEffect(() => {
    if (resultsPage > totalResultsPages) {
      setResultsPage(totalResultsPages);
    }
  }, [resultsPage, totalResultsPages]);

  const mapPoints = useMemo(() => {
    const points = [userLocation, ...visibleBuddies.map((buddy) => buddy.coordinates)];
    const bounds = calculateBounds(points);

    return visibleBuddies.map((buddy) => ({
      ...buddy,
      mapPosition: projectPoint(buddy.coordinates, bounds)
    }));
  }, [userLocation, visibleBuddies]);

  const userMapPosition = useMemo(() => {
    const points = [userLocation, ...visibleBuddies.map((buddy) => buddy.coordinates)];
    return projectPoint(userLocation, calculateBounds(points));
  }, [userLocation, visibleBuddies]);

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="explore-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
          <div className="explore-hero-content">
            <h1>
              Explore local sports buddies<span className="accent">.</span>
            </h1>
            <p>Filter by sport, gender, level, and search to refine map + list results.</p>
            <section className="explore-filters">
              <input
                type="search"
                className="explore-search-input"
                placeholder="Search by name, sport, location, or vibe"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search buddies"
              />
              <select
                value={selectedLocation}
                onChange={(event) => setSelectedLocation(event.target.value)}
              >
                {locationOptions.map((locationOption) => (
                  <option key={locationOption} value={locationOption}>
                    Location: {locationOption}
                  </option>
                ))}
              </select>
              <select value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)}>
                {sportOptions.map((sportOption) => (
                  <option key={sportOption} value={sportOption}>
                    Sport: {sportOption}
                  </option>
                ))}
              </select>
              <select value={selectedGender} onChange={(event) => setSelectedGender(event.target.value)}>
                {genderOptions.map((genderOption) => (
                  <option key={genderOption} value={genderOption}>
                    Gender: {genderOption}
                  </option>
                ))}
              </select>
              <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)}>
                {levelOptions.map((levelOption) => (
                  <option key={levelOption} value={levelOption}>
                    Level: {levelOption}
                  </option>
                ))}
              </select>
              <select
                value={selectedEquipment}
                onChange={(event) => setSelectedEquipment(event.target.value)}
              >
                <option value="All">Equipment: All</option>
                <option value="Yes">Equipment: Yes</option>
                <option value="No">Equipment: No</option>
              </select>
            </section>
          </div>
        </section>

        <main className="middle-section explore-page-content">
          <section className="explore-map-section" aria-label="Map of nearby buddies">
            <div className="explore-map">
              <div
                className="explore-map-user-pin"
                style={{ left: `${userMapPosition.x}%`, top: `${userMapPosition.y}%` }}
                title="You"
              >
                You
              </div>

              {mapPoints.map((buddy) => (
                <button
                  key={buddy.id}
                  type="button"
                  className="explore-map-pin"
                  style={{ left: `${buddy.mapPosition.x}%`, top: `${buddy.mapPosition.y}%` }}
                  title={`${buddy.name} • ${buddy.sport}`}
                >
                  <span aria-hidden="true">{SPORT_ICONS[buddy.sport] ?? "📍"}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="locals-section">
            <div className="section-head">
              <div>
                <h2 className="section-title">Nearby buddies ({visibleBuddies.length})</h2>
                <p className="section-sub">List results always mirror what is visible on the map.</p>
              </div>
            </div>

            <div className="locals-grid">
              {pagedBuddies.map((buddy) => (
                <Link to={`/buddy/${buddy.id}`} key={buddy.id} className="local-card-link">
                  <article className="local-card">
                    <div className="local-image-wrap">
                      <img src={buddy.image} alt={buddy.name} />
                    </div>
                    <div className="local-body">
                      <div className="local-title-row">
                        <h3>{buddy.name}</h3>
                        <p className="local-rating">
                          <span className="star">★</span> {buddy.rating}{" "}
                          <span className="review-count">({buddy.reviewCount})</span>
                        </p>
                      </div>
                      <p className="local-location">📍 {buddy.location}</p>
                      <span className="sport-pill">{buddy.sport}</span>
                      <p className="local-bio">{buddy.bio}</p>
                      <ul className="local-meta">
                        <li>👤 {buddy.gender ?? "Not specified"}</li>
                        <li>🏅 {buddy.level}</li>
                        <li>📏 {buddy.distanceKm.toFixed(1)} km away</li>
                      </ul>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
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
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default ExplorePage;
