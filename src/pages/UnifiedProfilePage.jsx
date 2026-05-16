import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import BuddyCard from "../components/BuddyCard";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { useHosts } from "../hooks/useHosts";
import { supabase } from "../lib/supabase";
import { getDateKey } from "../utils/date";
import { getAgeFromBirthday } from "../utils/profileAge";
import { sendNotification } from "../utils/sendNotification";
import { CURRENCY_SYMBOLS } from "../utils/pricing";
import { CANCELLATION_POLICIES, computeRefundPct, refundLabel } from "../utils/cancellationPolicy";

const FALLBACK_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='840' height='480' viewBox='0 0 840 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%2384cc16'/%3E%3Cstop offset='1' stop-color='%23065f46'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='840' height='480' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='52' fill='white'%3ESharedXP Event%3C/text%3E%3C/svg%3E";

const REVIEWS_PER_PAGE = 3;
const PHOTOS_PER_PAGE = 5;
const LOCALS_PER_PAGE = 4;
const DAY_NAME_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKS_AHEAD = 8;
const ALL_DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const getStars = (v) => `${"★".repeat(v)}${"☆".repeat(5 - v)}`;

const fmtMonthYear = (iso) => {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(iso));
};

const generateAvailableDates = (availabilityDays) => {
  const dayIndices =
    !Array.isArray(availabilityDays) || availabilityDays.length === 0
      ? ALL_DAY_INDICES
      : availabilityDays.map((d) => DAY_NAME_TO_INDEX[d]).filter((d) => d !== undefined);
  if (dayIndices.length === 0) return [];
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 0; offset < WEEKS_AHEAD * 7; offset++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (dayIndices.includes(candidate.getDay())) {
      dates.push(
        `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-${String(candidate.getDate()).padStart(2, "0")}`
      );
    }
  }
  return dates;
};

const generateTimeSlots = (startTime, endTime) => {
  const slots = [];
  const [startHour, startMin] = String(startTime || "09:00").split(":").map(Number);
  const [endHour, endMin] = String(endTime || "18:00").split(":").map(Number);
  let cur = startHour * 60 + (startMin || 0);
  const end = endHour * 60 + (endMin || 0);
  while (cur <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += 60;
  }
  return slots;
};

const shapeSupabaseHost = (data) => {
  const hp = data;
  const profile = data.profile;
  const languages = (profile.user_languages || [])
    .sort((a, b) => a.position - b.position)
    .map((ul) => ul.language)
    .filter(Boolean);
  const sports = (hp.host_sports || [])
    .filter((hs) => !hs.paused)
    .map((hs) => ({
      id: hs.id || null,
      sport: hs.sport || "",
      description: hs.description || "",
      about: hs.about || "",
      pricing: hs.pricing || 0,
      pricingCurrency: hs.pricing_currency || "EUR",
      level: hs.level || "",
      paused: false,
      equipmentAvailable: hs.equipment_available || false,
      equipmentDetails: hs.equipment_details || "",
      cancellationPolicy: hs.cancellation_policy || "flexible",
      availability: {
        days: hs.availability_days || [],
        startTime: hs.availability_start_time || "09:00",
        endTime: hs.availability_end_time || "18:00",
      },
      availableDates: generateAvailableDates(hs.availability_days),
      availableTimes: generateTimeSlots(
        hs.availability_start_time || "09:00",
        hs.availability_end_time || "18:00"
      ),
      images: (hs.host_sport_images || [])
        .sort((a, b) => a.position - b.position)
        .map((img) => img.image_url)
        .filter(Boolean),
    }));
  const fullName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Host";
  return {
    id: profile.id,
    name: fullName,
    fullName,
    image: profile.photo_url || "",
    birthday: profile.birthday || "",
    signedUpAt: profile.signed_up_at || "",
    city: hp.city || "",
    country: hp.country || "",
    paused: hp.pause_hosting || false,
    sports,
    languages,
  };
};

const getMemberSinceLabel = (signedUpAt) => {
  const ts = Date.parse(String(signedUpAt ?? ""));
  if (!Number.isFinite(ts)) return "New";
  const now = new Date();
  const then = new Date(ts);
  if (then > now) return "0 months";
  let months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  if (now.getDate() < then.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months >= 12) {
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} month${months === 1 ? "" : "s"}`;
};

const formatPrice = (amount, currency) => {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return "";
  const sym = CURRENCY_SYMBOLS[String(currency ?? "").toUpperCase()];
  if (sym) return `${sym}${num}`;
  return currency ? `${currency} ${num}` : String(num);
};

const StarRating = ({ rating }) => {
  const r = Math.round(Number(rating) * 2) / 2;
  return (
    <span className="guest-profile-stars" aria-label={`${r} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={r >= n ? "star filled" : r >= n - 0.5 ? "star half" : "star empty"}>
          ★
        </span>
      ))}
    </span>
  );
};

const getName = (p) =>
  p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "User";

const UnifiedProfilePage = ({ currentUser, onLogout }) => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("guest");

  // Guest role
  const [guestReviews, setGuestReviews] = useState([]);
  const [guestPhotos, setGuestPhotos] = useState([]);
  const [guestReviewsPage, setGuestReviewsPage] = useState(0);
  const [guestPhotosPage, setGuestPhotosPage] = useState(0);

  // Host role
  const [hostData, setHostData] = useState(null);
  const [hostReviews, setHostReviews] = useState([]);
  const [hostReviewsPage, setHostReviewsPage] = useState(0);
  const [hostPhotosPage, setHostPhotosPage] = useState(0);

  // Booking engine
  const [selectedSportIndex, setSelectedSportIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // ── Supabase fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setProfile(null);
    setGuestReviews([]);
    setGuestPhotos([]);
    setHostData(null);
    setHostReviews([]);
    setGuestReviewsPage(0);
    setHostReviewsPage(0);
    setSelectedSportIndex(0);
    setSelectedDate("");
    setSelectedTime("");

    let cancelled = false;

    Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, photo_url, signed_up_at, is_host, birthday, city, country")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("host_rating, sport, completed_at, counterparty_name, photo, photo_gallery")
        .eq("user_id", userId)
        .eq("role", "attended")
        .order("completed_at", { ascending: false }),
      supabase
        .from("booking_requests")
        .select("host_rating, host_review, host_rated_at, guest_photos, host_photos, sport, host_profile:profiles!host_id(full_name, first_name, last_name)")
        .eq("requester_id", userId)
        .eq("status", "completed")
        .order("host_rated_at", { ascending: false }),
    ]).then(async ([profileResult, legacyResult, brGuestResult]) => {
      if (cancelled) return;

      const profileData = profileResult.data ?? null;
      if (!profileResult.error && profileData) setProfile(profileData);

      // Guest reviews
      const legacyBookings = legacyResult.data ?? [];
      const brGuestRows = brGuestResult.data ?? [];
      const legacyGuestReviews = legacyBookings
        .filter((b) => Number(b.host_rating) > 0)
        .map((b) => ({ author: b.counterparty_name || "Host", overall: b.host_rating, sport: b.sport, date: b.completed_at }));
      const brGuestReviews = brGuestRows
        .filter((r) => Number(r.host_rating) > 0)
        .map((r) => {
          const p = r.host_profile;
          const hostName = p ? (p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Host") : "Host";
          return { author: hostName, overall: r.host_rating, comment: r.host_review || null, sport: r.sport, date: r.host_rated_at };
        });
      const allGuestReviews = [...brGuestReviews, ...legacyGuestReviews].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
      setGuestReviews(allGuestReviews);

      // Guest photos — both what the guest shared and what the host shared for those sessions
      const legacyPhotos = legacyBookings.flatMap((b) => [b.photo, ...(Array.isArray(b.photo_gallery) ? b.photo_gallery : [])]);
      const brPhotos = brGuestRows.flatMap((r) => [
        ...(Array.isArray(r.guest_photos) ? r.guest_photos : []),
        ...(Array.isArray(r.host_photos) ? r.host_photos : []),
      ]);
      const allPhotos = [...brPhotos, ...legacyPhotos]
        .map((p) => String(p ?? "").trim())
        .filter((p) => p && p !== FALLBACK_PHOTO);
      setGuestPhotos([...new Set(allPhotos)]);

      // Host data (if applicable)
      if (profileData?.is_host) {
        // Fetch host_profiles without cancellation_policy (moved to host_sports in migration 025).
        // Try including cancellation_policy in host_sports; if the column doesn't exist yet
        // (migration 025 pending), retry without it so availability dates still render.
        const fetchHostResult = async () => {
          const full = await supabase
            .from("host_profiles")
            .select(
              `pause_hosting, city, country,
               profile:profiles!user_id(
                 id, email, full_name, first_name, last_name, photo_url, gender, birthday, signed_up_at,
                 user_languages(language, position)
               ),
               host_sports(
                 id, sport, description, about, pricing, pricing_currency, level, paused,
                 equipment_available, equipment_details, cancellation_policy, availability_days,
                 availability_start_time, availability_end_time,
                 host_sport_images(image_url, position)
               )`
            )
            .eq("user_id", userId)
            .maybeSingle();
          if (!full.error) return full;
          // cancellation_policy column not yet in host_sports — retry without it
          return supabase
            .from("host_profiles")
            .select(
              `pause_hosting, city, country,
               profile:profiles!user_id(
                 id, email, full_name, first_name, last_name, photo_url, gender, birthday, signed_up_at,
                 user_languages(language, position)
               ),
               host_sports(
                 id, sport, description, about, pricing, pricing_currency, level, paused,
                 equipment_available, equipment_details, availability_days,
                 availability_start_time, availability_end_time,
                 host_sport_images(image_url, position)
               )`
            )
            .eq("user_id", userId)
            .maybeSingle();
        };

        const [hostResult, legacyHostResult, brHostResult] = await Promise.all([
          fetchHostResult(),
          supabase
            .from("bookings")
            .select("counterparty_name, attendee_rating, sport, completed_at")
            .eq("user_id", userId)
            .eq("role", "hosted")
            .gt("attendee_rating", 0)
            .order("completed_at", { ascending: false }),
          supabase
            .from("booking_requests")
            .select("requester_profile:profiles!requester_id(full_name, first_name, last_name), guest_rating, guest_host_ratings, guest_review, guest_photos, host_photos, sport, guest_rated_at")
            .eq("host_id", userId)
            .eq("status", "completed")
            .gt("guest_rating", 0)
            .order("guest_rated_at", { ascending: false })
            .then(async (res) => {
              if (res.error) {
                return supabase
                  .from("booking_requests")
                  .select("requester_profile:profiles!requester_id(full_name, first_name, last_name), guest_rating, guest_host_ratings, guest_review, guest_photos, sport, guest_rated_at")
                  .eq("host_id", userId)
                  .eq("status", "completed")
                  .gt("guest_rating", 0)
                  .order("guest_rated_at", { ascending: false });
              }
              return res;
            }),
        ]);

        if (cancelled) return;

        if (!hostResult.error && hostResult.data?.profile) {
          setHostData(shapeSupabaseHost(hostResult.data));
        }

        const legacyHostRevs = (legacyHostResult.data ?? []).map((r) => ({
          author: r.counterparty_name || "Attendee",
          overall: r.attendee_rating,
          sport: r.sport,
          date: r.completed_at,
        }));

        const brHostRevs = (brHostResult.data ?? []).map((r) => {
          const p = r.requester_profile;
          const author = p ? (p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Attendee") : "Attendee";
          const bd = r.guest_host_ratings ?? {};
          return {
            author,
            overall: r.guest_rating,
            punctuality: bd.punctuality ?? null,
            equipmentQuality: bd.equipmentQuality ?? null,
            localKnowledge: bd.localKnowledge ?? null,
            friendliness: bd.friendliness ?? null,
            value: bd.value ?? null,
            comment: r.guest_review || null,
            sport: r.sport,
            date: r.guest_rated_at,
            photos: [
              ...(Array.isArray(r.guest_photos) ? r.guest_photos : []),
              ...(Array.isArray(r.host_photos) ? r.host_photos : []),
            ].filter(Boolean),
          };
        });

        setHostReviews([...brHostRevs, ...legacyHostRevs]);

        // Default to host tab for visitors, guest tab for own profile
        const ownProfile = currentUser?.id === userId;
        setActiveTab(ownProfile ? "guest" : "host");
      } else {
        setActiveTab("guest");
      }

      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset booking state when switching sports
  useEffect(() => {
    setSelectedDate("");
    setSelectedTime("");
  }, [selectedSportIndex]);

  // ── Derived: host booking engine ────────────────────────────────────────────
  const hostSports = useMemo(
    () => (hostData && Array.isArray(hostData.sports) ? hostData.sports : []),
    [hostData]
  );

  const activeSport = hostSports[selectedSportIndex] ?? hostSports[0] ?? {};
  const availableDates = activeSport.availableDates ?? [];
  const availableTimes = activeSport.availableTimes ?? [];
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  useEffect(() => {
    if (availableDates.length === 0) return;
    setCalendarMonth((prev) => {
      const hasThisMonth = availableDates.some((d) => {
        const [y, m] = d.split("-").map(Number);
        return y === prev.getFullYear() && m === prev.getMonth() + 1;
      });
      if (hasThisMonth) return prev;
      const [y, m] = availableDates[0].split("-").map(Number);
      return new Date(y, m - 1, 1);
    });
  }, [availableDates]);

  const monthYearLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(calendarMonth);

  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const empties = Array.from({ length: firstDayIndex }, (_, i) => ({ id: `e-${i}`, isEmpty: true }));
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = getDateKey(year, month, day);
      return { id: dateKey, label: day, dateKey, isAvailable: availableDateSet.has(dateKey) };
    });
    return [...empties, ...days];
  }, [availableDateSet, calendarMonth]);

  // ── Derived: reviews / photos ────────────────────────────────────────────────
  const filteredHostReviews = useMemo(() => {
    const sport = activeSport?.sport ?? "";
    return hostReviews.filter((r) => !r.sport || r.sport === sport);
  }, [hostReviews, activeSport]);

  const sortedHostReviews = useMemo(
    () => [...filteredHostReviews].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    }),
    [filteredHostReviews]
  );

  const hostGalleryPhotos = useMemo(() => {
    const sport = activeSport?.sport ?? "";
    const sportImages = Array.isArray(activeSport?.images) ? activeSport.images.filter(Boolean) : [];
    const fallback = Array.isArray(hostData?.gallery) ? hostData.gallery.filter(Boolean) : [];
    const ratingPhotos = hostReviews
      .filter((r) => r.sport === sport && Array.isArray(r.photos))
      .flatMap((r) => r.photos.filter(Boolean));
    const base = sportImages.length > 0 ? sportImages : fallback.length > 0 ? fallback : [];
    return [...new Set([...base, ...ratingPhotos])];
  }, [activeSport, hostData, hostReviews]);

  // All session photos across every sport — used for own-profile host gallery
  const allHostSessionPhotos = useMemo(() =>
    [...new Set(
      hostReviews
        .filter((r) => Array.isArray(r.photos))
        .flatMap((r) => r.photos.filter(Boolean))
    )],
  [hostReviews]);

  // Recommendations — include the host being viewed so they appear in their own guest tab
  const { hosts: recommendations } = useHosts();
  const [recsPage, setRecsPage] = useState(0);
  const totalRecPages = Math.max(1, Math.ceil(recommendations.length / LOCALS_PER_PAGE));
  const visibleRecs = useMemo(
    () => recommendations.slice(recsPage * LOCALS_PER_PAGE, (recsPage + 1) * LOCALS_PER_PAGE),
    [recommendations, recsPage]
  );

  // ── Guard: loading / not found ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero"><SiteHeader currentUser={currentUser} onLogout={onLogout} /></section>
          <p style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>Loading profile…</p>
          <SiteFooter />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="home-page">
        <div className="middle-page-frame">
          <section className="hero auth-hero"><SiteHeader currentUser={currentUser} onLogout={onLogout} /></section>
          <main style={{ padding: "40px 20px", textAlign: "center" }}>
            <p>Profile not found.</p>
            <Link to="/" className="btn btn-primary">Go home</Link>
          </main>
          <SiteFooter />
        </div>
      </div>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────────
  const isOwnProfile = currentUser?.id === userId;
  const isHost = profile.is_host;
  const displayName = getName(profile);
  const age = getAgeFromBirthday(profile.birthday);
  const locationLine = [profile.city, profile.country].filter(Boolean).join(", ");
  const memberSince = getMemberSinceLabel(profile.signed_up_at ?? hostData?.signedUpAt);

  const guestAvg = guestReviews.length > 0
    ? (guestReviews.reduce((s, r) => s + Number(r.overall), 0) / guestReviews.length).toFixed(1)
    : null;
  const hostAvg = sortedHostReviews.length > 0
    ? (sortedHostReviews.reduce((s, r) => s + Number(r.overall), 0) / sortedHostReviews.length).toFixed(1)
    : null;

  const isHostPaused = Boolean(hostData?.paused) || (isOwnProfile && Boolean(currentUser?.hostProfile?.pauseHosting));
  const selectedPrice = formatPrice(activeSport.pricing, activeSport.pricingCurrency);
  const perLabel = activeSport.priceUnit ?? "per session";
  const canBook = Boolean(selectedDate && selectedTime);
  const hostLanguages = Array.isArray(hostData?.languages) ? hostData.languages.filter(Boolean).join(", ") : "";

  const totalGuestReviewPages = Math.max(1, Math.ceil(guestReviews.length / REVIEWS_PER_PAGE));
  const visibleGuestReviews = guestReviews.slice(guestReviewsPage * REVIEWS_PER_PAGE, (guestReviewsPage + 1) * REVIEWS_PER_PAGE);
  const totalGuestPhotoPages = Math.max(1, Math.ceil(guestPhotos.length / PHOTOS_PER_PAGE));
  const visibleGuestPhotos = guestPhotos.slice(guestPhotosPage * PHOTOS_PER_PAGE, (guestPhotosPage + 1) * PHOTOS_PER_PAGE);

  const totalHostReviewPages = Math.max(1, Math.ceil(sortedHostReviews.length / REVIEWS_PER_PAGE));
  const visibleHostReviews = sortedHostReviews.slice(hostReviewsPage * REVIEWS_PER_PAGE, (hostReviewsPage + 1) * REVIEWS_PER_PAGE);
  // Own profile: show all session photos (host + guest); visitor: show sport-filtered gallery
  const activeHostPhotos = isOwnProfile ? allHostSessionPhotos : hostGalleryPhotos;
  const totalHostPhotoPages = Math.max(1, Math.ceil(activeHostPhotos.length / PHOTOS_PER_PAGE));
  const visibleHostPhotos = activeHostPhotos.slice(hostPhotosPage * PHOTOS_PER_PAGE, (hostPhotosPage + 1) * PHOTOS_PER_PAGE);

  const formatDate = (v) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
      new Date(`${v}T00:00:00`)
    );
  const formatTime = (v) =>
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(
      new Date(`2000-01-01T${v}:00`)
    );
  const formatDateAria = (v) => {
    const [yr, mo, dy] = v.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(yr, mo - 1, dy)
    );
  };

  const handleOpenConfirmation = () => {
    if (!canBook) return;
    if (!currentUser) {
      sessionStorage.setItem("postAuthRedirect", location.pathname);
      setShowLoginPrompt(true);
      return;
    }
    setShowLoginPrompt(false);
    setIsRequestSubmitted(false);
    setIsConfirmationOpen(true);
  };

  const handleFinalConfirmation = async () => {
    if (!currentUser || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    const hostId = hostData?.id ?? profile.id;
    if (!hostId) {
      setSubmitError("Unable to identify host. Please try again.");
      setIsSubmitting(false);
      return;
    }
    const { data: bookingRequest, error } = await supabase
      .from("booking_requests")
      .insert({
        requester_id: currentUser.id,
        host_id: hostId,
        host_sport_id: activeSport.id ?? null,
        sport: activeSport.sport || "",
        requested_date: selectedDate,
        requested_time: selectedTime,
        price: Number(activeSport.pricing) || 0,
        currency: activeSport.pricingCurrency || "EUR",
        status: "pending",
        cancellation_policy: activeSport.cancellationPolicy || "flexible",
      })
      .select()
      .single();
    if (error || !bookingRequest) {
      setSubmitError("Failed to send booking request. Please try again.");
      setIsSubmitting(false);
      return;
    }
    sendNotification("booking_request_to_host", bookingRequest.id);
    setIsSubmitting(false);
    setIsRequestSubmitted(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const currentRating = activeTab === "host" ? hostAvg : guestAvg;
  const currentReviewCount = activeTab === "host" ? sortedHostReviews.length : guestReviews.length;

  return (
    <div className="home-page">
      <div className="middle-page-frame">
        <section className="hero auth-hero">
          <SiteHeader currentUser={currentUser} onLogout={onLogout} />
        </section>

        <main className="middle-section host-settings-page unified-profile-page">
          {/* ── Header ── */}
          <div className="guest-profile-header">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={displayName} className="guest-profile-photo" />
            ) : (
              <div className="guest-profile-photo guest-profile-photo-placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="guest-profile-info">
              <h1 className="guest-profile-name">
                {displayName}
                {age != null && <span className="guest-profile-age"> ({age})</span>}
                {currentRating !== null && (
                  <span className="guest-profile-rating-inline">
                    ⭐ {currentRating}
                    {currentReviewCount > 0 && ` (${currentReviewCount})`}
                  </span>
                )}
              </h1>
              {locationLine && <p className="guest-profile-location">{locationLine}</p>}
              {memberSince && <p className="guest-profile-member-since">Member since {memberSince}</p>}
              {isHost && hostLanguages && (
                <p className="unified-profile-languages"><strong>Languages:</strong> {hostLanguages}</p>
              )}
              {isOwnProfile && (
                <div className="unified-profile-own-actions">
                  <Link to="/my-profile" className="btn btn-primary">Edit Profile</Link>
                  {isHost && <Link to="/host-settings" className="btn btn-light">Host Settings</Link>}
                </div>
              )}
            </div>
          </div>

          {/* ── Role tabs ── */}
          {isHost && (
            <div className="host-tab-bar unified-profile-tabs">
              <button
                type="button"
                className={`host-tab-btn${activeTab === "guest" ? " active" : ""}`}
                onClick={() => setActiveTab("guest")}
              >
                As Guest
                {guestAvg !== null && (
                  <span className="unified-profile-tab-rating">⭐ {guestAvg}</span>
                )}
              </button>
              <button
                type="button"
                className={`host-tab-btn${activeTab === "host" ? " active" : ""}`}
                onClick={() => setActiveTab("host")}
              >
                As Host
                {hostAvg !== null && (
                  <span className="unified-profile-tab-rating">⭐ {hostAvg}</span>
                )}
              </button>
            </div>
          )}

          {/* ── Guest tab ── */}
          {activeTab === "guest" && (
            <>
              <section className="guest-profile-reviews">
                <h2 className="guest-profile-section-title">Reviews from hosts</h2>
                {guestReviews.length === 0 ? (
                  <p>No reviews yet.</p>
                ) : (
                  <>
                    {visibleGuestReviews.map((r, i) => (
                      <article key={i} className="guest-review-card">
                        <div className="guest-review-header">
                          <div>
                            <p className="guest-review-host">{r.author || "Host"}</p>
                            {r.sport && <p className="guest-review-sport">{r.sport}</p>}
                          </div>
                          <div className="guest-review-meta">
                            <StarRating rating={r.overall} />
                            {r.date && <p className="guest-review-date">{fmtMonthYear(r.date)}</p>}
                          </div>
                        </div>
                        {r.comment && <p className="guest-review-text">{r.comment}</p>}
                      </article>
                    ))}
                    {totalGuestReviewPages > 1 && (
                      <div className="locals-nav-row">
                        <button type="button" className="locals-nav" aria-label="Previous reviews"
                          onClick={() => setGuestReviewsPage((p) => Math.max(p - 1, 0))}
                          disabled={guestReviewsPage === 0}>‹</button>
                        <span className="locals-nav-info">{guestReviewsPage + 1} / {totalGuestReviewPages}</span>
                        <button type="button" className="locals-nav" aria-label="Next reviews"
                          onClick={() => setGuestReviewsPage((p) => Math.min(p + 1, totalGuestReviewPages - 1))}
                          disabled={guestReviewsPage >= totalGuestReviewPages - 1}>›</button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {(currentUser || !isHost) && (
                <section className="guest-profile-gallery">
                  <h2 className="guest-profile-section-title">Photo gallery</h2>
                  {guestPhotos.length === 0 ? (
                    <p>No photos yet.</p>
                  ) : (
                    <>
                      <div className="gallery-grid">
                        {visibleGuestPhotos.map((src) => (
                          <img key={src} src={src} alt="Experience photo" />
                        ))}
                      </div>
                      {totalGuestPhotoPages > 1 && (
                        <div className="locals-nav-row">
                          <button type="button" className="locals-nav" aria-label="Previous photos"
                            onClick={() => setGuestPhotosPage((p) => Math.max(p - 1, 0))}
                            disabled={guestPhotosPage === 0}>‹</button>
                          <span className="locals-nav-info">{guestPhotosPage + 1} / {totalGuestPhotoPages}</span>
                          <button type="button" className="locals-nav" aria-label="Next photos"
                            onClick={() => setGuestPhotosPage((p) => Math.min(p + 1, totalGuestPhotoPages - 1))}
                            disabled={guestPhotosPage >= totalGuestPhotoPages - 1}>›</button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {/* Recommendations — always in guest tab */}
              <section className="recommendations">
                <h3>More locals you might like</h3>
                <div className="locals-grid-wrap">
                  <div className="locals-grid">
                    {visibleRecs.map((rec) => <BuddyCard key={rec.id} buddy={rec} />)}
                  </div>
                  {totalRecPages > 1 && (
                    <div className="locals-nav-row">
                      <button type="button" className="locals-nav" aria-label="Show previous locals"
                        onClick={() => setRecsPage((p) => Math.max(p - 1, 0))}
                        disabled={recsPage === 0}>‹</button>
                      <button type="button" className="locals-nav" aria-label="Show next locals"
                        onClick={() => setRecsPage((p) => Math.min(p + 1, totalRecPages - 1))}
                        disabled={recsPage >= totalRecPages - 1}>›</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── Host tab ── */}
          {activeTab === "host" && isHost && (
            <>
              {/* Booking engine (visitors only) */}
              {!isOwnProfile && (
                <section className="booking-engine-section" aria-label="Booking engine">
                  <div className="booking-engine">
                    <h3>Book with {displayName}</h3>
                    {isHostPaused ? (
                      <p className="booking-paused-notice">This host is currently not accepting new bookings.</p>
                    ) : (
                      <>
                        {hostSports.length > 1 && (
                          <>
                            <p className="booking-label"><strong>Choose Category:</strong></p>
                            <div className="host-sport-tabs booking-sport-tabs" aria-label={`${displayName} sports`}>
                              {hostSports.map((sc, si) => (
                                <button key={si} type="button"
                                  className={`host-sport-tab${si === selectedSportIndex ? " active" : ""}`}
                                  onClick={() => setSelectedSportIndex(si)}>
                                  {sc.sport || `Sport ${si + 1}`}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {activeSport.description && (
                          <p className="booking-subtitle"><strong>Description:</strong> {activeSport.description}</p>
                        )}
                        {activeSport.about && (
                          <p className="booking-subtitle"><strong>About:</strong> {activeSport.about}</p>
                        )}

                        <p className="unified-profile-book-hint" style={{ marginBottom: 4 }}>Select a date and time below to book</p>
                        <p className="booking-label"><strong>Choose Date:</strong></p>
                        <div className="booking-calendar" aria-label="Available dates calendar">
                          <div className="booking-calendar-header">
                            <button type="button" className="calendar-nav-button" aria-label="Previous month"
                              onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
                            <strong>{monthYearLabel}</strong>
                            <button type="button" className="calendar-nav-button" aria-label="Next month"
                              onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
                          </div>
                          <div className="booking-weekdays">
                            {weekDays.map((d) => <span key={d}>{d}</span>)}
                          </div>
                          <div className="booking-calendar-grid">
                            {monthDays.map((day) =>
                              day.isEmpty ? (
                                <span key={day.id} className="booking-day-empty" />
                              ) : (
                                <button key={day.id} type="button"
                                  className={`booking-day${day.isAvailable ? " available" : " unavailable"}${selectedDate === day.dateKey ? " selected" : ""}`}
                                  aria-label={`${formatDateAria(day.dateKey)}, ${day.isAvailable ? "Available" : "Unavailable"}`}
                                  aria-disabled={!day.isAvailable}
                                  disabled={!day.isAvailable}
                                  onClick={() => { if (day.isAvailable) setSelectedDate((d) => d === day.dateKey ? "" : day.dateKey); }}>
                                  {day.label}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        <div className="booking-time-row">
                          <label className="booking-label" htmlFor="booking-time-select"><strong>Choose Time:</strong></label>
                          <select id="booking-time-select" className="booking-time-select" value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}>
                            <option value="">Select time</option>
                            {availableTimes.map((t) => (
                              <option key={t} value={t}>{formatTime(t)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="booking-details-group">
                          <p className="booking-label"><strong>Details:</strong></p>
                          {selectedPrice && <p className="booking-label"><strong>Price:</strong> {selectedPrice} {perLabel}</p>}
                          <p className="booking-label"><strong>Level:</strong> {activeSport.level || "Not specified"}</p>
                          <p className="booking-label"><strong>Equipment:</strong> {activeSport.equipmentAvailable ? "Available" : "Not available"}</p>
                          {activeSport.equipmentDetails && <p className="booking-subtitle">{activeSport.equipmentDetails}</p>}
                        </div>

                        {(() => {
                          const policy = activeSport.cancellationPolicy || "flexible";
                          const tier = CANCELLATION_POLICIES[policy];
                          return (
                            <div className="booking-cancel-policy">
                              <span className={`cancel-policy-badge cancel-policy-badge--${tier.color}`}>
                                {tier.label}
                              </span>
                              <span className="booking-cancel-policy-tagline">{tier.tagline}</span>
                            </div>
                          );
                        })()}

                        <p className="booking-selection-hint">
                          <span className={selectedDate ? "booking-hint-selected" : "booking-hint-unselected"}>
                            {selectedDate ? formatDate(selectedDate) : "No date selected"}
                          </span>
                          {" · "}
                          <span className={selectedTime ? "booking-hint-selected" : "booking-hint-unselected"}>
                            {selectedTime ? formatTime(selectedTime) : "No time selected"}
                          </span>
                        </p>

                        <button type="button" className="find-button booking-request-button"
                          disabled={!canBook} onClick={handleOpenConfirmation}>
                          Request booking
                        </button>

                        {showLoginPrompt && (
                          <div className="booking-login-prompt" role="alert">
                            <p>You need to login to book with a host.</p>
                            <div className="booking-login-prompt-actions">
                              <Link to="/login" state={{ from: { pathname: location.pathname } }} className="find-button booking-login-button">Log in</Link>
                              <Link to="/signup" state={{ from: { pathname: location.pathname } }} className="find-button booking-signup-button">Sign up</Link>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* Host photo gallery */}
              <section className="gallery">
                <h3>Photo gallery</h3>
                {activeHostPhotos.length === 0 ? (
                  <p>{isOwnProfile ? "No session photos yet." : "No photos yet for this sport."}</p>
                ) : (
                  <>
                    <div className="gallery-grid">
                      {visibleHostPhotos.map((src) => (
                        <img key={src} src={src} alt={`${displayName} gallery`} />
                      ))}
                    </div>
                    {totalHostPhotoPages > 1 && (
                      <div className="locals-nav-row">
                        <button type="button" className="locals-nav" aria-label="Previous photos"
                          onClick={() => setHostPhotosPage((p) => Math.max(p - 1, 0))}
                          disabled={hostPhotosPage === 0}>‹</button>
                        <span className="locals-nav-info">{hostPhotosPage + 1} / {totalHostPhotoPages}</span>
                        <button type="button" className="locals-nav" aria-label="Next photos"
                          onClick={() => setHostPhotosPage((p) => Math.min(p + 1, totalHostPhotoPages - 1))}
                          disabled={hostPhotosPage >= totalHostPhotoPages - 1}>›</button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Host reviews */}
              <section className="reviews">
                <h3>Reviews as host</h3>
                {sortedHostReviews.length === 0 ? (
                  <p>No reviews yet.</p>
                ) : (
                  <>
                    {visibleHostReviews.map((r, i) => (
                      <article key={i} className="review-card">
                        <p>
                          <strong>{r.author}</strong> · ⭐ {r.overall}
                          {r.date && <span className="review-date"> · {fmtMonthYear(r.date)}</span>}
                        </p>
                        {r.overall != null && (
                          <div className="review-breakdown">
                            {r.punctuality != null && <span>Punctuality {getStars(r.punctuality)}</span>}
                            {r.equipmentQuality != null && <span>Equipment {getStars(r.equipmentQuality)}</span>}
                            {r.localKnowledge != null && <span>Local knowledge {getStars(r.localKnowledge)}</span>}
                            {r.friendliness != null && <span>Friendliness {getStars(r.friendliness)}</span>}
                            {r.value != null && <span>Value {getStars(r.value)}</span>}
                          </div>
                        )}
                        {r.comment && <p>{r.comment}</p>}
                      </article>
                    ))}
                    {totalHostReviewPages > 1 && (
                      <div className="locals-nav-row">
                        <button type="button" className="locals-nav" aria-label="Previous reviews"
                          onClick={() => setHostReviewsPage((p) => Math.max(p - 1, 0))}
                          disabled={hostReviewsPage === 0}>‹</button>
                        <span className="locals-nav-info">{hostReviewsPage + 1} / {totalHostReviewPages}</span>
                        <button type="button" className="locals-nav" aria-label="Next reviews"
                          onClick={() => setHostReviewsPage((p) => Math.min(p + 1, totalHostReviewPages - 1))}
                          disabled={hostReviewsPage >= totalHostReviewPages - 1}>›</button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}

        </main>

        <SiteFooter />
      </div>

      {/* ── Booking confirmation modal ── */}
      {isConfirmationOpen && (
        <div className="booking-modal-backdrop" role="presentation" onClick={() => setIsConfirmationOpen(false)}>
          <section className="booking-modal" role="dialog" aria-modal="true" aria-label="Confirm booking request"
            onClick={(e) => e.stopPropagation()}>
            <button type="button" className="booking-modal-close" aria-label="Close booking confirmation"
              onClick={() => setIsConfirmationOpen(false)}>×</button>
            {!isRequestSubmitted ? (
              <>
                <h3>Confirm your booking request</h3>
                <p className="booking-modal-meta">
                  {displayName}{selectedPrice ? ` · ${selectedPrice} ${perLabel}` : ""}
                </p>
                <div className="booking-modal-list">
                  <p>{formatDate(selectedDate)} at {formatTime(selectedTime)}</p>
                </div>
                {submitError && <p className="booking-modal-error" role="alert">{submitError}</p>}
                <div className="booking-modal-actions">
                  <button type="button" className="btn btn-light" onClick={() => setIsConfirmationOpen(false)} disabled={isSubmitting}>Back</button>
                  <button type="button" className="find-button booking-confirm-button" onClick={handleFinalConfirmation} disabled={isSubmitting}>
                    {isSubmitting ? "Sending…" : "Final Confirmation"}
                  </button>
                </div>
              </>
            ) : (
              <div className="booking-success">
                <h3>Booking request sent!</h3>
                <p>Your request has been sent to {displayName}. You'll receive an email when they respond.</p>
                <div className="booking-modal-actions">
                  <button type="button" className="btn btn-light" onClick={() => setIsConfirmationOpen(false)}>Stay here</button>
                  <button type="button" className="find-button booking-confirm-button"
                    onClick={() => { setIsConfirmationOpen(false); navigate("/history?tab=pending"); }}>
                    View pending bookings
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default UnifiedProfilePage;
