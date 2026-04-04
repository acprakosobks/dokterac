import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wind, ArrowLeft, MapPin, Clock, Navigation, Route, CalendarClock, Loader2, SortAsc, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BookingDetailDialog from "@/components/BookingDetailDialog";
import RescheduleDialog from "@/components/RescheduleDialog";
import type { Json } from "@/integrations/supabase/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  on_progress: "Dalam Pengerjaan",
  done: "Selesai",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  on_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  done: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

interface Booking {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email?: string | null;
  customer_address_detail?: string | null;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  booking_date: string;
  booking_time: string;
  status: string;
  selected_services: Json;
  notes?: string | null;
  created_at: string;
  completion_notes?: string | null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDuration(distanceKm: number): string {
  const minutes = Math.round((distanceKm / 30) * 60);
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}j ${rem > 0 ? `${rem}m` : ""}`;
}

function getTotal(selected: Json): number {
  if (!Array.isArray(selected)) return 0;
  return (selected as any[]).reduce((sum, s) => sum + (Number(s?.price) || 0), 0);
}

function getServiceNames(selected: Json): string[] {
  if (!Array.isArray(selected)) return [];
  return selected.map((s: any) => s.name || "Layanan").filter(Boolean);
}

type SortMode = "time" | "distance";

const VendorDailyOrders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorLat, setVendorLat] = useState<number | null>(null);
  const [vendorLng, setVendorLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, selectedDate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, latitude, longitude")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!vendor) { navigate("/vendor/setup"); return; }

    setVendorLat(vendor.latitude ?? null);
    setVendorLng(vendor.longitude ?? null);

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .eq("vendor_id", vendor.id)
      .eq("booking_date", selectedDate)
      .not("status", "eq", "cancelled")
      .order("booking_time", { ascending: true });

    setBookings(bookingData || []);
    setLoading(false);
  };

  const bookingsWithDistance = useMemo(() => {
    return bookings.map((b) => {
      let distance: number | null = null;
      let duration: string | null = null;
      if (vendorLat && vendorLng && b.customer_latitude && b.customer_longitude) {
        distance = haversineDistance(vendorLat, vendorLng, b.customer_latitude, b.customer_longitude);
        duration = estimateDuration(distance);
      }
      return { ...b, distance, duration };
    });
  }, [bookings, vendorLat, vendorLng]);

  const sorted = useMemo(() => {
    const items = [...bookingsWithDistance];
    if (sortMode === "distance") {
      items.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    } else {
      items.sort((a, b) => a.booking_time.localeCompare(b.booking_time));
    }
    return items;
  }, [bookingsWithDistance, sortMode]);

  // Build Google Maps multi-stop route URL
  const routeUrl = useMemo(() => {
    if (!vendorLat || !vendorLng) return null;
    const waypoints = sorted
      .filter((b) => b.customer_latitude && b.customer_longitude)
      .map((b) => `${b.customer_latitude},${b.customer_longitude}`);
    if (waypoints.length === 0) return null;
    const origin = `${vendorLat},${vendorLng}`;
    if (waypoints.length === 1) {
      return `https://www.google.com/maps/dir/${origin}/${waypoints[0]}`;
    }
    const destination = waypoints[waypoints.length - 1];
    const middleWaypoints = waypoints.slice(0, -1).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(middleWaypoints)}`;
  }, [vendorLat, vendorLng, sorted]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">Pesanan Harian</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortMode === "time" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortMode("time")}
                >
                  <Clock className="h-4 w-4" />Urutkan Jam
                </Button>
                <Button
                  variant={sortMode === "distance" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortMode("distance")}
                >
                  <MapPin className="h-4 w-4" />Urutkan Jarak
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Map Link */}
        {routeUrl && sorted.length > 0 && (
          <Button className="w-full" size="lg" asChild>
            <a href={routeUrl} target="_blank" rel="noopener noreferrer">
              <Route className="h-5 w-5" />
              Buka Rute Perjalanan ({sorted.filter(b => b.customer_latitude).length} titik) di Google Maps
            </a>
          </Button>
        )}

        {/* Summary */}
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Pesanan</p>
              <p className="text-2xl font-display font-bold text-foreground">{sorted.length}</p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <p className="text-2xl font-display font-bold text-primary">
                Rp {sorted.reduce((sum, b) => sum + getTotal(b.selected_services), 0).toLocaleString("id-ID")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Order List */}
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Tidak ada pesanan pada tanggal ini.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((booking, index) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Order number */}
                    <div className="bg-primary/10 flex items-center justify-center px-4 min-w-[3rem]">
                      <span className="font-display font-bold text-primary text-lg">{index + 1}</span>
                    </div>

                    <div className="flex-1 p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{booking.customer_name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getServiceNames(booking.selected_services).map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status] || ""}`}>
                          {STATUS_LABELS[booking.status] || booking.status}
                        </span>
                      </div>

                      {/* Time, Distance, Price */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground">{booking.booking_time}</span>
                        </div>
                        {booking.distance !== null && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Navigation className="h-3.5 w-3.5" />
                            <span>{booking.distance.toFixed(1)} km</span>
                            <span className="text-muted-foreground/60">({booking.duration})</span>
                          </div>
                        )}
                        <div className="ml-auto font-medium text-primary">
                          Rp {getTotal(booking.selected_services).toLocaleString("id-ID")}
                        </div>
                      </div>

                      {booking.customer_address_detail && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          {booking.customer_address_detail}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => setSelectedBooking(booking)}>
                          <Eye className="h-4 w-4" />Detail
                        </Button>
                        {(booking.status === "pending" || booking.status === "confirmed") && (
                          <Button variant="outline" size="sm" onClick={() => setRescheduleBooking(booking)}>
                            <CalendarClock className="h-4 w-4" />Reschedule
                          </Button>
                        )}
                        {booking.customer_latitude && booking.customer_longitude && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={
                                vendorLat && vendorLng
                                  ? `https://www.google.com/maps/dir/${vendorLat},${vendorLng}/${booking.customer_latitude},${booking.customer_longitude}`
                                  : `https://www.google.com/maps?q=${booking.customer_latitude},${booking.customer_longitude}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MapPin className="h-4 w-4" />Maps
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BookingDetailDialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        booking={selectedBooking}
        vendorLat={vendorLat}
        vendorLng={vendorLng}
        onStatusChange={fetchData}
      />

      {rescheduleBooking && (
        <RescheduleDialog
          open={!!rescheduleBooking}
          onOpenChange={(open) => !open && setRescheduleBooking(null)}
          bookingId={rescheduleBooking.id}
          currentDate={rescheduleBooking.booking_date}
          currentTime={rescheduleBooking.booking_time}
          currentStatus={rescheduleBooking.status}
          customerName={rescheduleBooking.customer_name}
          onRescheduled={fetchData}
        />
      )}
    </div>
  );
};

export default VendorDailyOrders;
