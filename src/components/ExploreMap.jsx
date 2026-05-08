import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

const SPORT_EMOJI = {
  Cycling: "🚴",
  Tennis: "🎾",
  Running: "🏃",
  Basketball: "🏀",
  Surfing: "🏄",
  Swimming: "🏊",
  Yoga: "🧘",
  Football: "⚽",
  Soccer: "⚽",
  Golf: "⛳",
  Hiking: "🥾",
  Skiing: "⛷️",
  Boxing: "🥊",
  Volleyball: "🏐",
  Rugby: "🏉",
  Climbing: "🧗",
  Badminton: "🏸",
  "Table Tennis": "🏓",
  Padel: "🎾",
  Skateboarding: "🛹",
};

const getSportEmoji = (sports) => {
  if (!sports?.length) return "🏅";
  return SPORT_EMOJI[sports[0]?.sport] || "🏅";
};

const ExploreMap = ({ hosts, userLocation }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const hostLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Initialize map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    hostLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      hostLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Pan to user and show "You" pin when location is available
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const icon = L.divIcon({
      html: '<div class="explore-map-user-pin">You</div>',
      iconSize: [44, 28],
      iconAnchor: [22, 14],
      className: "",
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon,
      zIndexOffset: 1000,
    }).addTo(mapRef.current);

    mapRef.current.flyTo([userLocation.lat, userLocation.lng], 12, { duration: 1.2 });
  }, [userLocation]);

  // Re-render host pins whenever visible hosts or geocoded coords change
  useEffect(() => {
    if (!mapRef.current || !hostLayerRef.current) return;

    hostLayerRef.current.clearLayers();

    hosts.forEach((host) => {
      if (!host.coordinates) return;

      const emoji = getSportEmoji(host.sports);
      const sportLabel = host.sports
        .slice(0, 2)
        .map((s) => s.sport)
        .join(" · ");
      const location = [host.city, host.country].filter(Boolean).join(", ");

      const imgHtml = host.photo
        ? `<img src="${host.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
        : `<span style="font-size:18px;line-height:36px;">${emoji}</span>`;

      const icon = L.divIcon({
        html: `<div class="explore-map-pin" style="overflow:hidden;cursor:pointer;">${imgHtml}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        className: "",
      });

      const tooltipHtml = [
        `<strong>${host.name}</strong>`,
        location && `<span style="font-size:0.8em;color:#555;">${location}</span>`,
        sportLabel && `<span style="font-size:0.8em;color:#888;">${sportLabel}</span>`,
      ]
        .filter(Boolean)
        .join("<br/>");

      L.marker([host.coordinates.lat, host.coordinates.lng], { icon })
        .addTo(hostLayerRef.current)
        .bindTooltip(tooltipHtml, { direction: "top", offset: [0, -40], opacity: 1 })
        .on("click", () => navigate(`/buddy/${host.userId}`));
    });
  }, [hosts, navigate]);

  return <div ref={containerRef} className="explore-map" />;
};

export default ExploreMap;
