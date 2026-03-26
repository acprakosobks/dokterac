import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Wind, MapPin, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const DEMO_SERVICES = [
  { id: "1", service_name: "Cuci AC Split", price: 75000 },
  { id: "2", service_name: "Isi Freon", price: 250000 },
  { id: "3", service_name: "Bongkar Pasang AC", price: 350000 },
  { id: "4", service_name: "Perawatan Berkala", price: 150000 },
];

const BookingForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const total = selectedServices.reduce((sum, id) => {
    const svc = DEMO_SERVICES.find((s) => s.id === id);
    return sum + (svc?.price || 0);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      toast.error("Pilih minimal satu layanan.");
      return;
    }
    // TODO: Save to Supabase
    setSubmitted(true);
    toast.success("Booking berhasil dikirim!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Booking Terkirim!</h2>
            <p className="text-muted-foreground mb-6">
              Vendor akan segera menghubungi Anda melalui WhatsApp untuk konfirmasi.
            </p>
            <Button asChild>
              <Link to={`/v/${slug}`}>Kembali ke Profil Vendor</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/v/${slug}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">Booking Servis</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Data Pelanggan</CardTitle>
              <CardDescription>Informasi untuk menghubungi Anda.</CardDescription>
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
                <Label>Email</Label>
                <Input type="email" placeholder="email@contoh.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Lokasi Kunjungan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full h-48 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Pilih lokasi di peta</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Detail Alamat</Label>
                <Textarea placeholder="Nomor rumah, lantai, patokan, dll." value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Pilih Layanan</CardTitle>
              <CardDescription>Centang layanan yang Anda butuhkan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_SERVICES.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedServices.includes(svc.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedServices.includes(svc.id)}
                      onCheckedChange={() => toggleService(svc.id)}
                    />
                    <span className="font-medium text-foreground">{svc.service_name}</span>
                  </div>
                  <Badge variant="secondary">Rp {svc.price.toLocaleString("id-ID")}</Badge>
                </label>
              ))}
              {selectedServices.length > 0 && (
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="font-semibold text-foreground">Total Estimasi</span>
                  <span className="font-display font-bold text-lg text-primary">
                    Rp {total.toLocaleString("id-ID")}
                  </span>
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

          <Button type="submit" size="lg" className="w-full text-base py-6">
            <Send className="h-5 w-5" />
            Kirim Booking
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
