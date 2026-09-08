import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

const MOTO_IMG = "/markers/moto.png";
const DEST_IMG = "/markers/dest.png";

// Keyframe CSS injected once (module scope), instead of re-injecting a
// fresh <style> tag inside every marker's HTML on every re-render.
let pingStyleInjected = false;
function ensurePingStyle() {
  if (pingStyleInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-livemap-style", "true");
  style.textContent = `@keyframes pingMap {0%{transform:scale(0.8);opacity:.8}80%{transform:scale(1.8);opacity:0}100%{transform:scale(1.8);opacity:0}}`;
  document.head.appendChild(style);
  pingStyleInjected = true;
}

const courierIcon = () => {
  ensurePingStyle();
  return L.divIcon({
    className: "custom-courier",
    html: `
      <div style="position:relative;width:52px;height:52px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(0,210,255,0.35) 0%, transparent 70%);animation:pingMap 2s ease-out infinite;"></div>
        <img src="${MOTO_IMG}" style="position:absolute;left:2px;top:2px;width:48px;height:48px;border-radius:50%;border:2px solid #00D2FF;box-shadow:0 0 20px rgba(0,210,255,0.6);object-fit:cover;" />
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
};

const destinationIcon = L.divIcon({
  className: "custom-destination",
  html: `<img src="${DEST_IMG}" style="width:48px;height:48px;filter:drop-shadow(0 6px 14px rgba(0,210,255,0.5));" />`,
  iconSize: [48, 48],
  iconAnchor: [24, 48],
});

const fleetCourierIcon = (name) => L.divIcon({
  className: "fleet-courier",
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="background:#00D2FF;color:#090B10;font-weight:800;font-size:11px;padding:2px 8px;border-radius:9999px;box-shadow:0 4px 12px rgba(0,210,255,0.4);white-space:nowrap;font-family:'IBM Plex Sans',sans-serif;">${name}</div>
      <img src="${MOTO_IMG}" style="width:36px;height:36px;border-radius:50%;border:2px solid #00D2FF;box-shadow:0 0 12px rgba(0,210,255,0.6);object-fit:cover;" />
    </div>
  `,
  iconSize: [80, 56],
  iconAnchor: [40, 56],
});

// Manual Leaflet init via ref — immune to React.StrictMode double effects.
// Layers (markers/polyline) are UPDATED in place on prop changes instead of
// being torn down and recreated every tick — recreating them constantly was
// forcing Leaflet to reload tiles and mutate the DOM at a rate that raced
// with React's own reconciliation, producing "insertBefore" NotFoundErrors
// during the delivery simulation.
export default function LiveMap({
  destination,
  courier,
  trail = [],
  fleet = [],
  className = "",
  center,
  zoom = 13,
}) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const removedRef = useRef(false);
  const destMarkerRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const trailLineRef = useRef(null);
  const fleetMarkersRef = useRef(new Map()); // id -> marker
  const hasFitRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    removedRef.current = false;
    const map = L.map(divRef.current, { zoomControl: true });
    const init = center || (courier ? [courier.lat, courier.lng] : destination ? [destination.lat, destination.lng] : fleet[0] ? [fleet[0].lat, fleet[0].lng] : [-23.5505, -46.6333]);
    map.setView(init, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    setReady(true);
    return () => {
      removedRef.current = true;
      try { map.remove(); } catch (e) { /* container may already be gone */ }
      mapRef.current = null;
      destMarkerRef.current = null;
      courierMarkerRef.current = null;
      trailLineRef.current = null;
      fleetMarkersRef.current = new Map();
      hasFitRef.current = false;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const propsKey = JSON.stringify({ destination, courier, trail, fleet });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || removedRef.current) return;
    try {
      const pts = [];

      // Destination marker — create once, then just leave it (it doesn't move).
      if (destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng)) {
        const pos = [destination.lat, destination.lng];
        if (!destMarkerRef.current) {
          destMarkerRef.current = L.marker(pos, { icon: destinationIcon }).addTo(map).bindPopup("Destino da entrega");
        } else {
          destMarkerRef.current.setLatLng(pos);
        }
        pts.push(pos);
      } else if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }

      // Courier marker — moved in place every tick instead of recreated.
      if (courier && Number.isFinite(courier.lat) && Number.isFinite(courier.lng)) {
        const pos = [courier.lat, courier.lng];
        if (!courierMarkerRef.current) {
          courierMarkerRef.current = L.marker(pos, { icon: courierIcon() }).addTo(map).bindPopup("Entregador");
        } else {
          courierMarkerRef.current.setLatLng(pos);
        }
        pts.push(pos);
      } else if (courierMarkerRef.current) {
        courierMarkerRef.current.remove();
        courierMarkerRef.current = null;
      }

      // Trail polyline — update its points instead of remove+recreate.
      const validTrail = trail.filter((t) => Number.isFinite(t?.lat) && Number.isFinite(t?.lng));
      if (validTrail.length > 1) {
        const latlngs = validTrail.map((t) => [t.lat, t.lng]);
        if (!trailLineRef.current) {
          trailLineRef.current = L.polyline(latlngs, { color: "#00D2FF", weight: 4, opacity: 0.7, dashArray: "8 6" }).addTo(map);
        } else {
          trailLineRef.current.setLatLngs(latlngs);
        }
      } else if (trailLineRef.current) {
        trailLineRef.current.remove();
        trailLineRef.current = null;
      }

      // Fleet markers — reconcile by id: move existing, add new, remove stale.
      const seenIds = new Set();
      fleet.forEach((f) => {
        if (!Number.isFinite(f?.lat) || !Number.isFinite(f?.lng)) return;
        const id = f.id ?? f.name;
        seenIds.add(id);
        const pos = [f.lat, f.lng];
        const existing = fleetMarkersRef.current.get(id);
        if (existing) {
          existing.setLatLng(pos);
        } else {
          const m = L.marker(pos, { icon: fleetCourierIcon(f.name) }).addTo(map).bindPopup(f.name);
          fleetMarkersRef.current.set(id, m);
        }
        pts.push(pos);
      });
      fleetMarkersRef.current.forEach((m, id) => {
        if (!seenIds.has(id)) { m.remove(); fleetMarkersRef.current.delete(id); }
      });

      // Only auto-recenter the camera the first time markers appear, or
      // when there's a single point. Re-fitting on every ping made the
      // view (and tile requests) jump constantly during the simulation.
      if (pts.length === 1) {
        map.setView(pts[0], Math.max(map.getZoom(), 15));
      } else if (pts.length > 1 && !hasFitRef.current) {
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
      }
      if (pts.length > 0) hasFitRef.current = true;
    } catch (e) {
      console.error("LiveMap render error:", e);
    }
  }, [propsKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={divRef} data-testid="live-map" className={className} style={{ height: "100%", width: "100%" }} />;
}
