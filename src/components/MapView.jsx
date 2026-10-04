import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

const pin = (color, pulse) => L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
  html: `<span style="position:relative;display:block;width:22px;height:22px">${pulse ? `<span style="position:absolute;inset:0;border-radius:99px;background:${color};opacity:.5;animation:pulseRing 1.8s ease-out infinite"></span>` : ''}<span style="position:absolute;inset:4px;border-radius:99px;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span></span>` });
export const ICONS = { pickup: pin('#F97316'), dropoff: pin('#10B981'), rider: pin('#0E98E6', true), pick: pin('#8B5CF6') };

function Fit({ points }) {
  const map = useMap();
  useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [40, 40] }); else if (points[0]) map.setView(points[0], 14); }, [JSON.stringify(points)]); // eslint-disable-line
  return null;
}
function Picker({ onPick }) { useMapEvents({ click: (e) => onPick?.(e.latlng) }); return null; }

export default function MapView({ markers = [], line, trail, height = 320, onPick, fit = true }) {
  const pts = markers.map((m) => [m.lat, m.lng]);
  const center = pts[0] || [19.076, 72.8777];
  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-sky-100">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {markers.map((m, i) => <Marker key={i} position={[m.lat, m.lng]} icon={ICONS[m.kind] || ICONS.pick}>{m.label && <Popup>{m.label}</Popup>}</Marker>)}
        {line && <Polyline positions={line} pathOptions={{ color: '#0E98E6', weight: 4, dashArray: '8 8', opacity: 0.8 }} />}
        {trail?.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#8B5CF6', weight: 4 }} />}
        {fit && <Fit points={pts} />}
        {onPick && <Picker onPick={onPick} />}
      </MapContainer>
    </div>
  );
}
