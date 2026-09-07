import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

const MOTO_IMG = "/markers/moto.png";
const DEST_IMG = "/markers/dest.png";

const courierIcon = L.divIcon({
  className: "custom-courier",
  html: `
    <div style="position:relative;width:52px;height:52px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(0,210,255,0.35) 0%, transparent 70%);animation:pingMap 2s ease-out infinite;"></div>
      <img src="${MOTO_IMG}" style="position:absolute;left:2px;top:2px;width:48px;height:48px;border-radius:50%;border:2px solid #00D2FF;box-shadow:0 0 20px rgba(0,210,255,0.6);object-fit:cover;" />
    </div>
    <style>@keyframes pingMap {0%{transform:scale(0.8);opacity:.8}80%{transform:scale(1.8);opacity:0}100%{transform:scale(1.8);opacity:0}}</style>
  `,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

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

// Manual Leaflet init via ref — immune to React.StrictMode double effects
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
  const layersRef = useRef([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
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
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  const propsKey = JSON.stringify({ destination, courier, trail, fleet });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    const pts = [];

    if (destination) {
      const m = L.marker([destination.lat, destination.lng], { icon: destinationIcon }).addTo(map);
      m.bindPopup("Destino da entrega");
      layersRef.current.push(m);
      pts.push([destination.lat, destination.lng]);
    }
    if (courier && courier.lat) {
      const m = L.marker([courier.lat, courier.lng], { icon: courierIcon }).addTo(map);
      m.bindPopup("Entregador");
      layersRef.current.push(m);
      pts.push([courier.lat, courier.lng]);
    }
    if (trail.length > 1) {
      const line = L.polyline(trail.map((t) => [t.lat, t.lng]), { color: "#00D2FF", weight: 4, opacity: 0.7, dashArray: "8 6" }).addTo(map);
      layersRef.current.push(line);
    }
    fleet.forEach((f) => {
      const m = L.marker([f.lat, f.lng], { icon: fleetCourierIcon(f.name) }).addTo(map);
      m.bindPopup(f.name);
      layersRef.current.push(m);
      pts.push([f.lat, f.lng]);
    });

    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
  }, [propsKey, ready]);

  return <div ref={divRef} data-testid="live-map" className={className} style={{ height: "100%", width: "100%" }} />;
}
