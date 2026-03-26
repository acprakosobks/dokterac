import { lazy, Suspense } from "react";

const MapPicker = lazy(() => import("./MapPicker"));

interface MapPickerLazyProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
}

const MapPickerLazy = (props: MapPickerLazyProps) => (
  <Suspense fallback={<div className={`w-full ${props.height || "h-64"} rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground text-sm`}>Memuat peta...</div>}>
    <MapPicker {...props} />
  </Suspense>
);

export default MapPickerLazy;
