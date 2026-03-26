import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  readonly?: boolean;
}

const MapPicker = ({ latitude, longitude, onLocationChange, height = "h-64", readonly = false }: MapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else if (mapRef.current) {
          markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
        }
        mapRef.current?.setView([lat, lng], 15);
        onLocationChange(lat, lng);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: L.LatLngExpression = latitude && longitude ? [latitude, longitude] : [-6.2088, 106.8456];

    const map = L.map(containerRef.current).setView(center, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude]).addTo(map);
    }

    if (!readonly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
        onLocationChange(lat, lng);
      });
    }

    mapRef.current = map;
    setReady(true);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker when props change externally
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (latitude && longitude) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);
      }
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
    }
  }, [latitude, longitude, ready]);

  return (
    <div className="relative">
      <div className={`w-full ${height} rounded-xl overflow-hidden border border-border`}>
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {!readonly && (
        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute bottom-3 right-3 z-[1000] bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground shadow-md hover:bg-accent transition-colors flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>
          Lokasi Saat Ini
        </button>
      )}
    </div>
  );
};

export default MapPicker;
