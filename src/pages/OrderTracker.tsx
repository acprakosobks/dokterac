import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Calendar, Clock, Package, CheckCircle2, Circle, Truck, XCircle, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  pending: { label: "Menunggu Konfirmasi", color: "bg-yellow-500", icon: <Circle className="h-4 w-4" />, step: 1 },
  confirmed: { label: "Dikonfirmasi", color: "bg-blue-500", icon: <CheckCircle2 className="h-4 w-4" />, step: 2 },
  on_progress: { label: "Sedang Dikerjakan", color: "bg-orange-500", icon: <Truck className="h-4 w-4" />, step: 3 },
  done: { label: "Selesai Dikerjakan", color: "bg-emerald-500", icon: <CheckCircle2 className="h-4 w-4" />, step: 4 },
  completed: { label: "Selesai", color: "bg-green-600", icon: <CheckCircle2 className="h-4 w-4" />, step: 5 },
  cancelled: { label: "Dibatalkan", color: "bg-red-500", icon: <XCircle className="h-4 w-4" />, step: -1 },
};

const steps = ["pending", "confirmed", "on_progress", "done", "completed"];

export default function OrderTracker() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchId, setSearchId] = useState("");
  const [activeId, setActiveId] = useState(orderId || "");

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["track-booking", activeId],
    queryFn: async () => {
      if (!activeId) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("*, vendors(company_name, whatsapp_number, address_full)")
        .eq("id", activeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeId,
  });

  const { data: logs } = useQuery({
    queryKey: ["track-logs", activeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_status_logs")
        .select("*")
        .eq("booking_id", activeId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeId,
  });

  const handleSearch = () => {
    if (searchId.trim()) setActiveId(searchId.trim());
  };

  const services = (booking?.selected_services as any[]) || [];
  const currentStatus = booking ? statusConfig[booking.status] : null;
  const currentStep = currentStatus?.step || 0;
  const isCancelled = booking?.status === "cancelled";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container max-w-2xl mx-auto px-4 text-center">
          <Package className="h-10 w-10 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Lacak Pesanan</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Pantau status servis AC Anda secara realtime</p>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 -mt-6 pb-12 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan nomor pesanan..."
                value={searchId || orderId || ""}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="font-mono text-sm"
              />
              <Button onClick={handleSearch} size="sm">
                <Search className="h-4 w-4 mr-1" /> Cari
              </Button>
            </div>
          </CardContent>
        </Card>

        {!activeId && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Masukkan nomor pesanan untuk melacak status servis Anda.
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {activeId && !isLoading && !booking && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Pesanan tidak ditemukan. Pastikan nomor pesanan benar.
            </CardContent>
          </Card>
        )}

        {booking && (
          <>
            {/* Status Badge */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground font-mono">#{booking.id.slice(0, 8).toUpperCase()}</span>
                  <Badge className={`${currentStatus?.color} text-white border-0`}>
                    {currentStatus?.label}
                  </Badge>
                </div>

                {/* Progress Steps */}
                {!isCancelled && (
                  <div className="flex items-center justify-between mt-4">
                    {steps.map((s, i) => {
                      const conf = statusConfig[s];
                      const isActive = currentStep >= conf.step;
                      return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className={`flex flex-col items-center`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isActive ? conf.color : "bg-muted"}`}>
                              {i + 1}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {conf.label}
                            </span>
                          </div>
                          {i < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${currentStep > conf.step ? "bg-primary" : "bg-muted"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isCancelled && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center text-red-700 text-sm mt-2">
                    Pesanan ini telah dibatalkan.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detail Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(booking.booking_date), "EEEE, dd MMMM yyyy", { locale: id })}
                    </p>
                    <p className="text-muted-foreground">{booking.booking_time?.slice(0, 5)} WIB</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p>{booking.customer_address_detail || "Alamat tidak tersedia"}</p>
                </div>
                {booking.notes && (
                  <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
                    Catatan: {booking.notes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services */}
            {services.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Layanan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {services.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{s.service_name || s.name}</span>
                        <span className="font-medium">Rp {Number(s.price || 0).toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>Rp {services.reduce((t: number, s: any) => t + Number(s.price || 0), 0).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vendor */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mitra Servis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-medium">{(booking as any).vendors?.company_name}</p>
                {(booking as any).vendors?.whatsapp_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`https://wa.me/${(booking as any).vendors.whatsapp_number}`} className="text-primary underline">
                      {(booking as any).vendors.whatsapp_number}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Logs */}
            {logs && logs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Riwayat Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[log.new_status]?.color || "bg-muted"}`} />
                          <div className="w-px flex-1 bg-border" />
                        </div>
                        <div className="pb-3">
                          <p className="font-medium">{statusConfig[log.new_status]?.label || log.new_status}</p>
                          {log.notes && <p className="text-muted-foreground text-xs">{log.notes}</p>}
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
