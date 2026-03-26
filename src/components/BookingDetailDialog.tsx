import { useMemo } from "react";
import { MessageCircle, MapPin, User, Phone, Mail, Calendar, Clock, FileText, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Json } from "@/integrations/supabase/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

interface BookingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
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
  } | null;
  vendorLat?: number | null;
  vendorLng?: number | null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDuration(distanceKm: number): string {
  // Rough estimate: 30 km/h average speed in city
  const minutes = Math.round((distanceKm / 30) * 60);
  if (minutes < 60) return `~${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `~${hours} jam ${rem > 0 ? `${rem} menit` : ""}`;
}

const BookingDetailDialog = ({ open, onOpenChange, booking, vendorLat, vendorLng }: BookingDetailDialogProps) => {
  const services = booking ? (Array.isArray(booking.selected_services) ? (booking.selected_services as any[]) : []) : [];
  const total = services.reduce((sum, s) => sum + (Number(s?.price) || 0), 0);

  const distanceInfo = useMemo(() => {
    if (booking && vendorLat && vendorLng && booking.customer_latitude && booking.customer_longitude) {
      const dist = haversineDistance(vendorLat, vendorLng, booking.customer_latitude, booking.customer_longitude);
      return { distance: dist, duration: estimateDuration(dist) };
    }
    return null;
  }, [vendorLat, vendorLng, booking?.customer_latitude, booking?.customer_longitude]);

  if (!booking) return null;

  const googleMapsUrl = booking.customer_latitude && booking.customer_longitude
    ? vendorLat && vendorLng
      ? `https://www.google.com/maps/dir/${vendorLat},${vendorLng}/${booking.customer_latitude},${booking.customer_longitude}`
      : `https://www.google.com/maps?q=${booking.customer_latitude},${booking.customer_longitude}`
    : null;

  const waUrl = `https://wa.me/${booking.customer_whatsapp}?text=${encodeURIComponent(
    `Halo ${booking.customer_name}, pesanan servis AC Anda pada ${booking.booking_date} jam ${booking.booking_time} telah kami terima. Terima kasih!`
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            Detail Pesanan
          </DialogTitle>
          <DialogDescription>
            Dibuat pada {new Date(booking.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status] || ""}`}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Data Pelanggan</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{booking.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{booking.customer_whatsapp}</span>
              </div>
              {booking.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.customer_email}</span>
                </div>
              )}
              {booking.customer_address_detail && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{booking.customer_address_detail}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Jadwal</h4>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{booking.booking_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{booking.booking_time}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Services */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Layanan</h4>
            <div className="space-y-2">
              {services.map((s: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{s.name || "Layanan"}</span>
                  <span className="font-medium">Rp {(Number(s.price) || 0).toLocaleString("id-ID")}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">Rp {total.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />Catatan
                </h4>
                <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{booking.notes}</p>
              </div>
            </>
          )}

          {/* Distance info */}
          {distanceInfo && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Navigation className="h-4 w-4" />Jarak & Estimasi Perjalanan
                </h4>
                <div className="flex gap-4 text-sm">
                  <div className="bg-primary/10 rounded-lg px-4 py-2 text-center flex-1">
                    <p className="text-xs text-muted-foreground">Jarak</p>
                    <p className="font-display font-bold text-primary">{distanceInfo.distance.toFixed(1)} km</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg px-4 py-2 text-center flex-1">
                    <p className="text-xs text-muted-foreground">Estimasi</p>
                    <p className="font-display font-bold text-primary">{distanceInfo.duration}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2">
            <Button className="flex-1" asChild>
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />WhatsApp
              </a>
            </Button>
            {googleMapsUrl && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4" />Buka Lokasi
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailDialog;
