import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ACTIVE_STATUSES = ["pending", "accepted", "payment_pending", "in_progress", "disputed"];

const ExploreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EventsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4" />
    <polyline points="3 3 3 7 7 7" />
  </svg>
);

const ProfileIcon = ({ currentUser }) => {
  if (currentUser?.photo) {
    return (
      <img
        src={currentUser.photo}
        alt={currentUser.fullName || "Profile"}
        className="bottom-nav-avatar"
      />
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

const BottomNav = ({ currentUser }) => {
  const location = useLocation();
  const [hasActive, setHasActive] = useState(false);
  const path = location.pathname;

  useEffect(() => {
    if (!currentUser?.id) { setHasActive(false); return; }
    supabase
      .from("booking_requests")
      .select("id")
      .or(`requester_id.eq.${currentUser.id},host_id.eq.${currentUser.id}`)
      .in("status", ACTIVE_STATUSES)
      .limit(1)
      .then(({ data }) => setHasActive(Boolean(data?.length)));
  }, [currentUser?.id]);

  const tabs = [
    { to: "/locals",     label: "Explore",  Icon: ExploreIcon },
    { to: "/the-field",  label: "Field",    Icon: FieldIcon },
    { to: "/events",     label: "Events",   Icon: EventsIcon },
    {
      to: currentUser ? "/history" : "/login",
      label: "History",
      Icon: HistoryIcon,
      badge: hasActive,
    },
    {
      to: currentUser ? "/user-profile" : "/login",
      label: currentUser ? "Profile" : "Log in",
      Icon: null,
      isProfile: true,
    },
  ];

  const isActive = (to) => {
    if (to === "/locals") return path === "/locals";
    if (to === "/the-field") return path === "/the-field";
    if (to === "/events") return path === "/events";
    if (to === "/history" || to === "/login") return path === "/history";
    if (to === "/user-profile") return path === "/user-profile" || path === "/my-profile";
    return path === to;
  };

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ to, label, Icon, badge, isProfile }) => {
        const active = isActive(to);
        return (
          <Link
            key={to}
            to={to}
            className={`bottom-nav-tab${active ? " bottom-nav-tab-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              {isProfile
                ? <ProfileIcon currentUser={currentUser} />
                : <Icon />}
              {badge && <span className="bottom-nav-badge" aria-label="Active bookings" />}
            </span>
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
