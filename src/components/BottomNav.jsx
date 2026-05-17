import { Link, useLocation } from "react-router-dom";

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

const HostIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TABS = [
  { to: "/locals",    label: "Explore",  Icon: ExploreIcon },
  { to: "/the-field", label: "Field",    Icon: FieldIcon },
  { to: "/events",    label: "Events",   Icon: EventsIcon },
  { to: "host",       label: "Host",     Icon: HostIcon, isHost: true },
];

const BottomNav = ({ currentUser }) => {
  const location = useLocation();
  const path = location.pathname;

  const hostTo = currentUser?.isHost ? "/host-settings" : "/become-a-host";
  const hostLabel = currentUser?.isHost ? "Host" : "Be a Host";
  const isHostingPaused = Boolean(currentUser?.isHost && currentUser?.hostProfile?.pauseHosting);

  const isActive = (tab) => {
    if (tab.isHost) return path === "/host-settings" || path === "/become-a-host";
    if (tab.to === "/locals") return path === "/locals";
    if (tab.to === "/the-field") return path === "/the-field";
    if (tab.to === "/events") return path === "/events";
    return false;
  };

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => {
        const to = tab.isHost ? hostTo : tab.to;
        const label = tab.isHost ? hostLabel : tab.label;
        const active = isActive(tab);
        const paused = tab.isHost && isHostingPaused;
        return (
          <Link
            key={tab.label}
            to={to}
            className={`bottom-nav-tab${active ? " bottom-nav-tab-active" : ""}${paused ? " bottom-nav-tab-paused" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon"><tab.Icon /></span>
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
