import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard";
import RolePill from "../components/RolePill";
import ScrollRow from "../components/ScrollRow";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { loadMajorEventsPage } from "../lib/events";
import { supabase } from "../lib/supabase";
import { deleteFieldPost, fetchFieldPosts, fetchLikedPostIds, reportFieldPost, toggleFieldPostLike } from "../utils/fieldPosts";
import { getAgeFromBirthday } from "../utils/profileAge";


const PAGE_INITIAL = 20;
const PAGE_MORE = 10;

const HOST_SELECT = `id, country, city, pause_hosting,
  profile:profiles!user_id(id, full_name, first_name, last_name, photo_url, gender, birthday, signed_up_at),
  host_sports!inner(id, sport, level, equipment_available, paused)`;

const toHostObject = (hp) => ({
  id: hp.id,
  userId: hp.profile.id,
  name:
    hp.profile.full_name ||
    [hp.profile.first_name, hp.profile.last_name].filter(Boolean).join(" ") ||
    "Host",
  photo: hp.profile.photo_url || "",
  gender: hp.profile.gender || "",
  birthday: hp.profile.birthday || "",
  country: hp.country || "",
  city: hp.city || "",
  signedUpAt: hp.profile.signed_up_at || "",
  sports: (hp.host_sports || []).filter((hs) => !hs.paused),
});

const sortHosts = (list) =>
  [...list].sort((a, b) => {
    if (a.signedUpAt && b.signedUpAt) return b.signedUpAt.localeCompare(a.signedUpAt);
    if (a.signedUpAt) return -1;
    if (b.signedUpAt) return 1;
    return 0;
  });

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const steps = [
  {
    stepNum: 1,
    title: "1. Find your host",
    text: "Browse local sports hosts by sport, city, and level — filter by equipment too.",
    img: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=500&h=220&q=80"
  },
  {
    stepNum: 2,
    title: "2. Book in seconds",
    text: "Message your host, agree on details, and confirm your session securely.",
    img: "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=500&h=220&q=80"
  },
  {
    stepNum: 3,
    title: "3. Play like a local",
    text: "Show up, have fun, and experience your destination through sport.",
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
    <rect x="12" y="34" width="48" height="30" rx="7" stroke="#96c93d" strokeWidth="3" />
    <path
      d="M24 34V24a12 12 0 0124 0v10"
      stroke="#96c93d"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="36" cy="49" r="4" fill="#96c93d" />
    <line x1="36" y1="53" x2="36" y2="58" stroke="#96c93d" strokeWidth="3" strokeLinecap="round" />
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
  const [fieldPostsList, setFieldPostsList] = useState([]);
  const [fieldPostsLoading, setFieldPostsLoading] = useState(true);
  const [fieldDeletedIds, setFieldDeletedIds] = useState(() => new Set());
  const [fieldCarouselIndex, setFieldCarouselIndex] = useState({});
  const [likedPostIds, setLikedPostIds] = useState(() => fetchLikedPostIds());
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());

  const handleDeleteFieldPost = useCallback((postId) => {
    if (!window.confirm("Remove this post from The Field?")) return;
    deleteFieldPost(postId);
    setFieldDeletedIds((prev) => new Set([...prev, postId]));
  }, []);

  const handleLikeFieldPost = useCallback(async (post) => {
    if (pendingLikeIds.has(post.id)) return;
    const isCurrentlyLiked = likedPostIds.has(post.id);
    setPendingLikeIds((prev) => new Set([...prev, post.id]));
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setFieldPostsList((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
          : p
      )
    );
    const result = await toggleFieldPostLike(post.id, currentUser?.id);
    if (!result) {
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setFieldPostsList((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: post.likes } : p))
      );
    } else {
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (result.liked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setFieldPostsList((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: result.likes } : p))
      );
    }
    setPendingLikeIds((prev) => {
      const next = new Set(prev);
      next.delete(post.id);
      return next;
    });
  }, [likedPostIds, pendingLikeIds]);
  const getFieldCarouselIndex = useCallback(
    (postId) => fieldCarouselIndex[postId] ?? 0,
    [fieldCarouselIndex]
  );
  const shiftFieldCarousel = useCallback((postId, photos, step) => {
    setFieldCarouselIndex((prev) => {
      const current = prev[postId] ?? 0;
      const next = (current + step + photos.length) % photos.length;
      return { ...prev, [postId]: next };
    });
  }, []);

  const [hostLocations, setHostLocations] = useState([]);
  const [allSports, setAllSports] = useState([]);
  const [hostsHasMore, setHostsHasMore] = useState(false);
  const [hostsLoadingMore, setHostsLoadingMore] = useState(false);
  const [hostsOffset, setHostsOffset] = useState(0);
  const [fieldHasMore, setFieldHasMore] = useState(false);
  const [fieldLoadingMore, setFieldLoadingMore] = useState(false);
  const [majorEventsList, setMajorEventsList] = useState([]);
  const [majorEventsLoading, setMajorEventsLoading] = useState(true);
  const [eventsHasMore, setEventsHasMore] = useState(false);
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false);
  const searchBarRef = useRef(null);

  const loadMoreHosts = useCallback(async () => {
    if (!hostsHasMore || hostsLoadingMore) return;
    setHostsLoadingMore(true);

    let q = supabase
      .from("host_profiles")
      .select(HOST_SELECT)
      .eq("pause_hosting", false)
      .eq("host_sports.paused", false)
      .order("id", { ascending: false })
      .range(hostsOffset, hostsOffset + PAGE_MORE - 1);

    if (selectedCountry !== "All") q = q.eq("country", selectedCountry);
    if (selectedCity !== "All") q = q.eq("city", selectedCity);
    if (selectedSport !== "All") q = q.eq("host_sports.sport", selectedSport);

    const { data, error } = await q;
    if (!error && data) {
      setHosts((prev) => [
        ...prev,
        ...sortHosts(data.filter((hp) => hp.profile && (hp.host_sports || []).length > 0).map(toHostObject)),
      ]);
      setHostsHasMore(data.length === PAGE_MORE);
      setHostsOffset((prev) => prev + data.length);
    }
    setHostsLoadingMore(false);
  }, [hostsHasMore, hostsLoadingMore, hostsOffset, selectedCountry, selectedCity, selectedSport]);

  const loadMoreFieldPosts = useCallback(async () => {
    if (!fieldHasMore || fieldLoadingMore) return;
    setFieldLoadingMore(true);
    const { posts, hasMore } = await fetchFieldPosts({ limit: PAGE_MORE, offset: fieldPostsList.length });
    setFieldPostsList((prev) => [...prev, ...posts]);
    setFieldHasMore(hasMore);
    setFieldLoadingMore(false);
  }, [fieldHasMore, fieldLoadingMore, fieldPostsList.length]);

  const loadMoreEvents = useCallback(async () => {
    if (!eventsHasMore || eventsLoadingMore) return;
    setEventsLoadingMore(true);
    const { events, hasMore } = await loadMajorEventsPage({ limit: PAGE_MORE, offset: majorEventsList.length });
    setMajorEventsList((prev) => [...prev, ...events]);
    setEventsHasMore(hasMore);
    setEventsLoadingMore(false);
  }, [eventsHasMore, eventsLoadingMore, majorEventsList.length]);

  // Fetch dropdown option data once on mount (independent of filters)
  useEffect(() => {
    supabase.from("host_profiles").select("country, city").eq("pause_hosting", false)
      .then(({ data }) => { if (data) setHostLocations(data.filter((r) => r.country)); });
    supabase.from("host_sports").select("sport").eq("paused", false).not("sport", "is", null)
      .then(({ data }) => { if (data) setAllSports([...new Set(data.map((r) => r.sport).filter(Boolean))].sort()); });
  }, []);

  // Re-fetch hosts from DB whenever filters change
  useEffect(() => {
    let cancelled = false;
    setHostsLoading(true);
    setHosts([]);
    setHostsOffset(0);
    setHostsHasMore(false);

    let q = supabase
      .from("host_profiles")
      .select(HOST_SELECT)
      .eq("pause_hosting", false)
      .eq("host_sports.paused", false)
      .order("id", { ascending: false })
      .range(0, PAGE_INITIAL - 1);

    if (selectedCountry !== "All") q = q.eq("country", selectedCountry);
    if (selectedCity !== "All") q = q.eq("city", selectedCity);
    if (selectedSport !== "All") q = q.eq("host_sports.sport", selectedSport);

    q.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("[home] Failed to fetch hosts:", error);
        setHosts([]);
        setHostsHasMore(false);
      } else {
        const raw = data || [];
        setHosts(sortHosts(raw.filter((hp) => hp.profile && (hp.host_sports || []).length > 0).map(toHostObject)));
        setHostsHasMore(raw.length === PAGE_INITIAL);
        setHostsOffset(raw.length);
      }
      setHostsLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedCountry, selectedCity, selectedSport]);

  useEffect(() => {
    let cancelled = false;
    setMajorEventsLoading(true);
    loadMajorEventsPage({ limit: PAGE_INITIAL }).then(({ events, hasMore }) => {
      if (cancelled) return;
      setMajorEventsList(events);
      setEventsHasMore(hasMore);
      setMajorEventsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchFieldPosts({ limit: PAGE_INITIAL }).then(({ posts, hasMore }) => {
      setFieldPostsList(posts);
      setFieldHasMore(hasMore);
      setFieldPostsLoading(false);
    });
  }, []);


  const countryOptions = useMemo(
    () => ["All", ...[...new Set(hostLocations.map((l) => l.country).filter(Boolean))].sort()],
    [hostLocations]
  );

  const cityOptions = useMemo(() => {
    const forCountry = selectedCountry === "All"
      ? hostLocations
      : hostLocations.filter((l) => l.country === selectedCountry);
    return ["All", ...[...new Set(forCountry.map((l) => l.city).filter(Boolean))].sort()];
  }, [hostLocations, selectedCountry]);

  const sportOptions = useMemo(() => ["All", ...allSports], [allSports]);

  useEffect(() => {
    if (selectedCity !== "All" && !cityOptions.includes(selectedCity)) {
      setSelectedCity("All");
    }
  }, [cityOptions, selectedCity]);

  const activeFieldPosts = useMemo(
    () => fieldPostsList.filter((p) => !fieldDeletedIds.has(p.id)),
    [fieldPostsList, fieldDeletedIds]
  );

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
              Find a local sport
              <br />
              host<span className="dot">.</span> <span className="accent">Anywhere.</span>
            </h1>
            <p>Train, play, and explore with locals — wherever you travel.</p>
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
                aria-label="Find a host"
                onClick={handleFindBuddies}
              >
                Find a Host
              </button>
            </div>
          </div>
        </section>

        <main className="middle-section home-main">
          {/* ── Locals ───────────────────────────────────────── */}
          <section className="locals-section" id="locals">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  Locals ready to play in {localsHeadingLocation}
                </h2>
                <p className="section-sub">
                  Local hosts ready to play — real people, real connections.
                </p>
              </div>
              <Link to="/locals" className="view-all-link">
                View all
              </Link>
            </div>

            <div className="locals-grid-wrap">
              {hostsLoading ? (
                <p className="explore-loading">Loading locals…</p>
              ) : hosts.length === 0 ? (
                <p className="explore-empty">No locals found matching your filters.</p>
              ) : (
                <ScrollRow onLoadMore={hostsHasMore ? loadMoreHosts : undefined} isLoadingMore={hostsLoadingMore}>
                          {hosts.map((host) => {
                    const locationLine = [host.city, host.country].filter(Boolean).join(", ");
                    const hasEquipment = host.sports.some((s) => s.equipment_available);
                    const levels = [
                      ...new Set(host.sports.map((s) => s.level).filter(Boolean))
                    ];
                    return (
                      <Link to={`/user/${host.userId}`} key={host.id} className="local-card-link">
                        <article className="field-card">
                          <div className="field-host-row">
                            {host.photo ? (
                              <img src={host.photo} alt={host.name} className="field-host-avatar" loading="lazy" />
                            ) : (
                              <div className="field-host-avatar field-host-avatar-fallback">
                                {String(host.name ?? "?").trim().split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"}
                              </div>
                            )}
                            <div>
                              <p>
                                <span className="field-host-name">{host.name}</span>
                                {locationLine && <span className="field-host-city"> · {locationLine}</span>}
                              </p>
                              <div className="local-sport-pills">
                                {host.sports.slice(0, 3).map((s) => (
                                  <span key={s.id} className="sport-pill">{s.sport}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {host.photo ? (
                            <img src={host.photo} alt={host.name} className="field-post-photo" loading="lazy" />
                          ) : (
                            <div className="field-post-photo-placeholder" />
                          )}
                          <p className="field-meta">
                            {[
                              (host.gender || getAgeFromBirthday(host.birthday)) && `👤 ${[host.gender, getAgeFromBirthday(host.birthday)].filter(Boolean).join(", ")}`,
                              levels.length > 0 && `🏅 ${levels.join(", ")}`,
                              `🎒 ${hasEquipment ? "Yes" : "No"}`,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </article>
                      </Link>
                    );
                  })}
                </ScrollRow>
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
            {fieldPostsLoading ? (
              <p className="explore-loading">Loading…</p>
            ) : activeFieldPosts.length === 0 ? (
              <p className="explore-empty">
                No sessions shared yet.{" "}
                <Link to="/history" className="field-share-invite-link">
                  Complete a booking and share your experience!
                </Link>
              </p>
            ) : (
              <ScrollRow onLoadMore={fieldHasMore ? loadMoreFieldPosts : undefined} isLoadingMore={fieldLoadingMore}>
                  {activeFieldPosts.map((post) => {
                    const isOwner = post.posterId != null && post.posterId === currentUser?.id;
                    const postLocation = [post.city, post.country].filter(Boolean).join(", ");
                    const postRating = Number(post.rating ?? 0);
                    const profilePath =
                      post.posterId && String(post.posterId).trim() !== ""
                        ? `/user/${post.posterId}`
                        : null;
                    const avatar = post.hostPhoto ? (
                      <img src={post.hostPhoto} alt={post.hostName} className="field-host-avatar" loading="lazy" />
                    ) : (
                      <div className="field-host-avatar field-host-avatar-fallback" aria-hidden="true">
                        {String(post.hostName ?? "?").trim().split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"}
                      </div>
                    );
                    return (
                      <article key={post.id} className="field-card">
                        <div className="field-host-row">
                          {profilePath ? (
                            <Link to={profilePath} className="field-host-link" aria-label={`View ${post.hostName} profile`}>
                              {avatar}
                            </Link>
                          ) : (
                            avatar
                          )}
                          <div>
                            <p>
                              {profilePath ? (
                                <Link to={profilePath} className="field-host-name field-host-name-link">
                                  {post.hostName}
                                </Link>
                              ) : (
                                <span className="field-host-name">{post.hostName}</span>
                              )}
                              <span className="field-host-rating">
                                {" · "}⭐ {postRating > 0 ? postRating.toFixed(1) : "Not rated"}
                              </span>
                              {postLocation && (
                                <span className="field-host-city"> · {postLocation}</span>
                              )}
                            </p>
                            <div className="field-sport-pill-row">
                              <span className="sport-pill">{post.sport}</span>
                              <RolePill role={post.role} />
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const photos = Array.isArray(post.photos) && post.photos.length > 0
                            ? post.photos
                            : post.photo
                              ? [post.photo]
                              : [];
                          if (photos.length === 0) return null;
                          const idx = getFieldCarouselIndex(post.id);
                          return (
                            <div className="field-carousel">
                              {photos.length > 1 && (
                                <button
                                  type="button"
                                  className="field-carousel-nav field-carousel-prev"
                                  aria-label="Previous photo"
                                  onClick={() => shiftFieldCarousel(post.id, photos, -1)}
                                >
                                  ‹
                                </button>
                              )}
                              <img
                                src={photos[idx]}
                                alt={post.sport}
                                className="field-post-photo"
                                loading="lazy"
                              />
                              {photos.length > 1 && (
                                <button
                                  type="button"
                                  className="field-carousel-nav field-carousel-next"
                                  aria-label="Next photo"
                                  onClick={() => shiftFieldCarousel(post.id, photos, 1)}
                                >
                                  ›
                                </button>
                              )}
                              {photos.length > 1 && (
                                <p className="field-carousel-counter">{idx + 1} / {photos.length}</p>
                              )}
                            </div>
                          );
                        })()}
                        <p className="field-caption">{post.caption}</p>
                        <p className="field-meta">
                          <button
                            type="button"
                            className="field-like-btn"
                            onClick={() => handleLikeFieldPost(post)}
                            disabled={pendingLikeIds.has(post.id)}
                            aria-label={likedPostIds.has(post.id) ? "Unlike" : "Like"}
                          >
                            {likedPostIds.has(post.id) ? "❤️" : "🤍"}
                          </button>
                          {" "}{post.likes}
                        </p>
                        <div className="field-post-actions">
                          {isOwner && post.sourceRequestId && (
                            <Link
                              to={`/history?editRating=${post.sourceRequestId}`}
                              className="field-post-action-link"
                            >
                              Edit post
                            </Link>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              className="field-post-action-link"
                              aria-label="Delete this post"
                              onClick={() => handleDeleteFieldPost(post.id)}
                            >
                              Delete post
                            </button>
                          )}
                          {!isOwner && (
                            <button
                              type="button"
                              className="field-post-action-link"
                              onClick={() => {
                                if (window.confirm("Report this post as inappropriate?\n\nWe will review it and take action if needed.")) {
                                  reportFieldPost(post.id, currentUser?.id);
                                  window.alert("Thank you — your report has been received.");
                                }
                              }}
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
              </ScrollRow>
            )}
          </section>

          {/* ── Major Events ─────────────────────────────────── */}
          <section className="major-events-section" id="major-events">
            <div className="section-head">
              <div>
                <h2 className="section-title">Major Events</h2>
                <p className="section-sub">
                  Marathons, Grand Slams, cycling Monuments, F1 and more.
                </p>
              </div>
              <Link to="/events" className="view-all-link">
                View all
              </Link>
            </div>

            {majorEventsLoading ? (
              <p className="explore-loading">Loading events…</p>
            ) : majorEventsList.length === 0 ? (
              <p className="explore-empty">No major events to show right now.</p>
            ) : (
              <ScrollRow onLoadMore={eventsHasMore ? loadMoreEvents : undefined} isLoadingMore={eventsLoadingMore}>
                {majorEventsList.map((event) => (
                  <EventCard key={event.id} event={event} compact />
                ))}
              </ScrollRow>
            )}
          </section>

          {/* ── How it works ─────────────────────────────────── */}
          <section className="how-section">
            <h2 className="section-title">How it works</h2>
            <p className="section-sub">From discovery to kick-off in minutes.</p>
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
