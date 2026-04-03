import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wind, MapPin, ArrowLeft, Send, CheckCircle2, Loader2, Navigation } from "lucide-react";
import MapPicker from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ServiceData {
  id: string;
  service_name: string;
  price: number;
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

const GeneralBooking = () => {
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [previewVendorName, setPreviewVendorName] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultVendor, setResultVendor] = useState<{ name: string; distance: number } | null>(null);

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerLat(pos.coords.latitude);
        setCustomerLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        toast.error("Gagal mendapatkan lokasi. Silakan izinkan akses lokasi.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // When location changes, fetch services from nearest vendor (preview only)
  useEffect(() => {
    if (customerLat === null || customerLng === null) return;

    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const { data: vendors } = await supabase
          .from("vendors")
          .select("id, company_name, latitude, longitude")
          .eq("is_active", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null);

        if (!vendors || vendors.length === 0) {
          setServices([]);
          setPreviewVendorName(null);
          return;
        }

        const sorted = vendors
          .map((v) => ({
            ...v,
            distance: haversineDistance(customerLat, customerLng, v.latitude!, v.longitude!),
          }))
          .sort((a, b) => a.distance - b.distance);

        const nearest = sorted[0];
        setPreviewVendorName(nearest.company_name);

        const { data: svcData } = await supabase
          .from("services")
          .select("id, service_name, price")
          .eq("vendor_id", nearest.id);

        setServices((svcData || []).map((s) => ({ ...s, price: Number(s.price) })));
        setSelectedServices([]);
      } catch {
        // silent
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [customerLat, customerLng]);

  const toggleService = (id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const total = selectedServices.reduce((sum, id) => {
    const svc = services.find((s) => s.id === id);
    return sum + (svc?.price || 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerLat === null || customerLng === null) {
      toast.error("Tentukan lokasi Anda terlebih dahulu.");
      return;
    }
    if (selectedServices.length === 0) {
      toast.error("Pilih minimal satu layanan.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          customer_name: customerName,
          customer_whatsapp: customerWhatsapp,
          customer_email: customerEmail || null,
          customer_address_detail: customerAddress,
          customer_latitude: customerLat,
          customer_longitude: customerLng,
          booking_date: bookingDate,
          booking_time: bookingTime,
          notes: notes || null,
          selected_service_ids: selectedServices,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResultVendor({ name: data.vendor_name, distance: data.vendor_distance_km });
      setSuccess(true);
      toast.success("Booking berhasil dikirim!");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Booking Terkirim!</h2>
            <p className="text-muted-foreground mb-2">
              Pesanan Anda diteruskan ke <span className="font-semibold">{resultVendor?.name}</span>
              {resultVendor?.distance != null && ` (${resultVendor.distance} km)`}.
            </p>
            <p className="text-muted-foreground mb-6">Vendor akan segera menghubungi Anda melalui WhatsApp.</p>
            <Button asChild>
              <Link to="/">Kembali ke Beranda</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">Booking Servis AC</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Lokasi Anda
              </CardTitle>
              <CardDescription>
                Tentukan lokasi untuk mencari vendor terdekat saat pengiriman.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MapPicker
                latitude={customerLat}
                longitude={customerLng}
                onLocationChange={(lat, lng) => {
                  setCustomerLat(lat);
                  setCustomerLng(lng);
                }}
                height="h-48"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleLocateMe}
                disabled={locating}
                className="w-full"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                {locating ? "Mencari lokasi..." : "Gunakan Lokasi Saya"}
              </Button>
              {customerLat !== null && (
                <p className="text-xs text-muted-foreground text-center">
                  Koordinat: {customerLat.toFixed(5)}, {customerLng?.toFixed(5)}
                </p>
              )}
              <div className="space-y-2">
                <Label>Detail Alamat</Label>
                <Textarea placeholder="Nomor rumah, lantai, patokan, dll." value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Data Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input placeholder="Nama Anda" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Nomor WhatsApp</Label>
                  <Input placeholder="628123456789" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email (opsional)</Label>
                <Input type="email" placeholder="email@contoh.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Pilih Layanan</CardTitle>
              <CardDescription>
                {previewVendorName
                  ? `Layanan dari vendor terdekat: ${previewVendorName}`
                  : "Tentukan lokasi untuk melihat layanan tersedia."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingServices && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingServices && customerLat === null && (
                <p className="text-muted-foreground text-sm text-center py-4">Tentukan lokasi Anda terlebih dahulu.</p>
              )}
              {!loadingServices && customerLat !== null && services.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">Tidak ada layanan tersedia di area ini.</p>
              )}
              {services.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedServices.includes(svc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedServices.includes(svc.id)} onCheckedChange={() => toggleService(svc.id)} />
                    <span className="font-medium text-foreground">{svc.service_name}</span>
                  </div>
                  <Badge variant="secondary">Rp {svc.price.toLocaleString("id-ID")}</Badge>
                </label>
              ))}
              {selectedServices.length > 0 && (
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="font-semibold text-foreground">Total Estimasi</span>
                  <span className="font-display font-bold text-lg text-primary">Rp {total.toLocaleString("id-ID")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Jadwal Kunjungan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required min={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Waktu</Label>
                  <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} required />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label>Catatan Tambahan</Label>
                <Textarea placeholder="Info tambahan untuk teknisi (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full text-base py-6"
            disabled={submitting || selectedServices.length === 0 || customerLat === null}
          >
            <Send className="h-5 w-5" />
            {submitting ? "Mengirim..." : "Kirim Booking"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default GeneralBooking;
