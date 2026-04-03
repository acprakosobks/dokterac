import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Loader2, Navigation, Wind, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface VendorWithDistance {
  id: string;
  company_name: string;
  slug: string;
  address_full: string | null;
  distance: number;
  service_count: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NearestVendors = () => {
  const [vendors, setVendors] = useState<VendorWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchNearestVendors = (lat: number, lng: number) => {
    const loadVendors = async () => {
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, company_name, slug, address_full, latitude, longitude")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (!vendorData || vendorData.length === 0) {
        setVendors([]);
        setLoading(false);
        return;
      }

      const withDist = vendorData
        .map((v) => ({
          ...v,
          distance: haversineDistance(lat, lng, v.latitude!, v.longitude!),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      // Fetch service counts for these vendors
      const vendorIds = withDist.map((v) => v.id);
      const { data: vsData } = await supabase
        .from("vendor_services")
        .select("vendor_id")
        .in("vendor_id", vendorIds)
        .eq("is_active", true);

      const countMap = new Map<string, number>();
      (vsData || []).forEach((vs: any) => {
        countMap.set(vs.vendor_id, (countMap.get(vs.vendor_id) || 0) + 1);
      });

      setVendors(
        withDist.map((v) => ({
          id: v.id,
          company_name: v.company_name,
          slug: v.slug,
          address_full: v.address_full,
          distance: v.distance,
          service_count: countMap.get(v.id) || 0,
        }))
      );
      setLoading(false);
    };
    loadVendors();
  };

  const requestLocation = () => {
    setLoading(true);
    setLocationError(false);
    if (!navigator.geolocation) {
      setLocationError(true);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchNearestVendors(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocationError(true);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Mencari mitra terdekat dari lokasi Anda...</p>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Navigation className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground mb-1">Akses lokasi diperlukan</p>
          <p className="text-muted-foreground text-sm mb-4">Izinkan akses lokasi untuk melihat mitra servis AC terdekat.</p>
        </div>
        <Button variant="outline" onClick={() => { setRetrying(true); requestLocation(); }} disabled={retrying}>
          <Navigation className="h-4 w-4" />
          Izinkan Lokasi
        </Button>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-12">
        <Wind className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">Belum ada mitra aktif di area Anda.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {vendors.map((vendor) => (
        <Card key={vendor.id} className="group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display font-bold text-lg text-card-foreground group-hover:text-primary transition-colors">
                {vendor.company_name}
              </h3>
              <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                {vendor.distance < 1
                  ? `${Math.round(vendor.distance * 1000)} m`
                  : `${vendor.distance.toFixed(1)} km`}
              </Badge>
            </div>
            {vendor.address_full && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5 mb-3">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{vendor.address_full}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mb-4">
              {vendor.service_count} layanan tersedia
            </p>
            <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" asChild>
              <Link to={`/v/${vendor.slug}`}>
                Lihat Profil
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NearestVendors;
