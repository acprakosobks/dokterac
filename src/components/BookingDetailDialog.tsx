import { useMemo, useState } from "react";
import { MessageCircle, MapPin, User, Phone, Mail, Calendar, Clock, FileText, Navigation, Play, CheckCircle, XCircle, Loader2, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookingStatusLog from "@/components/BookingStatusLog";
import BookingCompletionPhotos from "@/components/BookingCompletionPhotos";
import BookingCompletionDialog from "@/components/BookingCompletionDialog";
import CancelBookingDialog from "@/components/CancelBookingDialog";
import RescheduleDialog from "@/components/RescheduleDialog";
import type { Json } from "@/integrations/supabase/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  on_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  done: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  on_progress: "Dalam Pengerjaan",
  done: "Selesai",
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
    completion_notes?: string | null;
  } | null;
  vendorLat?: number | null;
  vendorLng?: number | null;
  onStatusChange?: () => void;
  isAdmin?: boolean;
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
  const minutes = Math.round((distanceKm / 30) * 60);
  if (minutes < 60) return `~${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `~${hours} jam ${rem > 0 ? `${rem} menit` : ""}`;
}

const BookingDetailDialog = ({ open, onOpenChange, booking, vendorLat, vendorLng, onStatusChange, isAdmin }: BookingDetailDialogProps) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const { toast } = useToast();

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

  const changeStatus = async (newStatus: string, logNote: string) => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("bookings").update({ status: newStatus } as any).eq("id", booking.id);
      if (error) throw error;

      await supabase.from("booking_status_logs").insert({
        booking_id: booking.id,
        old_status: booking.status,
        new_status: newStatus,
        changed_by: user?.id,
        notes: logNote,
      } as any);

      toast({ title: "Berhasil", description: logNote });
      onStatusChange?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const googleMapsUrl = booking.customer_latitude && booking.customer_longitude
    ? vendorLat && vendorLng
      ? `https://www.google.com/maps/dir/${vendorLat},${vendorLng}/${booking.customer_latitude},${booking.customer_longitude}`
      : `https://www.google.com/maps?q=${booking.customer_latitude},${booking.customer_longitude}`
    : null;

  const waUrl = `https://wa.me/${booking.customer_whatsapp}?text=${encodeURIComponent(
    `Halo ${booking.customer_name}, pesanan servis AC Anda pada ${booking.booking_date} jam ${booking.booking_time} telah kami terima. Terima kasih!`
  )}`;

  const renderStatusActions = () => {
    if (isAdmin) return null;
    const status = booking.status;

    return (
      <div className="flex flex-col gap-2">
        {(status === "pending" || status === "confirmed") && (
          <Button variant="outline" onClick={() => setRescheduleOpen(true)} disabled={actionLoading} className="w-full">
            <CalendarClock className="h-4 w-4" />Reschedule
          </Button>
        )}
        {status === "pending" && (
          <>
            <Button onClick={() => changeStatus("confirmed", "Pesanan dikonfirmasi")} disabled={actionLoading} className="w-full">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Konfirmasi Pesanan
            </Button>
            <Button variant="destructive" onClick={() => setCancelOpen(true)} disabled={actionLoading} className="w-full">
              <XCircle className="h-4 w-4" />Batalkan
            </Button>
          </>
        )}
        {status === "confirmed" && (
          <>
            <Button onClick={() => changeStatus("on_progress", "Pengerjaan dimulai")} disabled={actionLoading} className="w-full">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Mulai Pengerjaan
            </Button>
            <Button variant="destructive" onClick={() => setCancelOpen(true)} disabled={actionLoading} className="w-full">
              <XCircle className="h-4 w-4" />Batalkan
            </Button>
          </>
        )}
        {status === "on_progress" && (
          <Button onClick={() => setCompletionOpen(true)} disabled={actionLoading} className="w-full">
            <CheckCircle className="h-4 w-4" />Selesaikan Pesanan
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">Detail Pesanan</DialogTitle>
            <DialogDescription>
              Dibuat pada {new Date(booking.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status] || ""}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Data Pelanggan</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{booking.customer_name}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{booking.customer_whatsapp}</span></div>
                {booking.customer_email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{booking.customer_email}</span></div>}
                {booking.customer_address_detail && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{booking.customer_address_detail}</span></div>}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Jadwal</h4>
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{booking.booking_date}</span></div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>{booking.booking_time}</span></div>
              </div>
            </div>

            <Separator />

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

            {booking.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4" />Catatan</h4>
                  <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{booking.notes}</p>
                </div>
              </>
            )}

            {booking.completion_notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4" />Catatan Penyelesaian</h4>
                  <p className="text-sm text-muted-foreground bg-green-500/5 rounded-lg p-3 border border-green-500/10">{booking.completion_notes}</p>
                </div>
              </>
            )}

            {(booking.status === "done" || booking.status === "completed") && (
              <>
                <Separator />
                <BookingCompletionPhotos bookingId={booking.id} />
              </>
            )}

            {distanceInfo && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Navigation className="h-4 w-4" />Jarak & Estimasi</h4>
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

            <Separator />
            <BookingStatusLog bookingId={booking.id} showSLA />

            {renderStatusActions()}

            <Separator />

            <div className="flex flex-col gap-2">
              <Button className="w-full" asChild>
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />WhatsApp
                </a>
              </Button>
              {googleMapsUrl ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4" />Buka Google Maps
                  </a>
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  <MapPin className="h-4 w-4" />Lokasi belum tersedia
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BookingCompletionDialog
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        bookingId={booking.id}
        onCompleted={() => {
          onStatusChange?.();
          onOpenChange(false);
        }}
      />

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        bookingId={booking.id}
        currentStatus={booking.status}
        onCancelled={() => {
          onStatusChange?.();
          onOpenChange(false);
        }}
      />
    </>
  );
};

export default BookingDetailDialog;
