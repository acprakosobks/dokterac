import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wind, Plus, Trash2, Save, Clock, MapPin } from "lucide-react";
import MapPicker from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ServiceItem {
  id: string;
  name: string;
  price: string;
  description: string;
  isNew?: boolean;
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const VendorSetup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([
    { id: crypto.randomUUID(), name: "", price: "", description: "", isNew: true },
  ]);
  const [schedule, setSchedule] = useState<Record<string, { open: string; close: string; active: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d, { open: "08:00", close: "17:00", active: true }]))
  );

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadVendor = async () => {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (vendor) {
        setVendorId(vendor.id);
        setCompanyName(vendor.company_name);
        setWhatsapp(vendor.whatsapp_number);
        setEmail(vendor.email || "");
        setSlug(vendor.slug);
        setAddress(vendor.address_full || "");
        setLatitude(vendor.latitude);
        setLongitude(vendor.longitude);
        if (vendor.operational_hours && typeof vendor.operational_hours === "object") {
          setSchedule(vendor.operational_hours as any);
        }
        const { data: svcData } = await supabase
          .from("services")
          .select("*")
          .eq("vendor_id", vendor.id);
        if (svcData && svcData.length > 0) {
          setServices(svcData.map((s) => ({ id: s.id, name: s.service_name, price: String(s.price), description: s.description || "" })));
        }
      }
    };
    loadVendor();
  }, [user]);

  const addService = () => {
    setServices([...services, { id: crypto.randomUUID(), name: "", price: "", description: "", isNew: true }]);
  };

  const removeService = (id: string) => {
    if (services.length <= 1) return;
    setServices(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string) => {
    setServices(services.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!companyName || !whatsapp || !slug) {
      toast.error("Lengkapi data perusahaan terlebih dahulu.");
      return;
    }
    setSaving(true);
    try {
      let currentVendorId = vendorId;
      if (vendorId) {
        const { error } = await supabase.from("vendors").update({
          company_name: companyName, whatsapp_number: whatsapp, email, slug,
          address_full: address, operational_hours: schedule,
        }).eq("id", vendorId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("vendors").insert({
          user_id: user.id, company_name: companyName, whatsapp_number: whatsapp,
          email, slug, address_full: address, operational_hours: schedule,
        }).select().single();
        if (error) throw error;
        currentVendorId = data.id;
        setVendorId(data.id);
      }

      // Sync services: delete old, insert all
      if (currentVendorId) {
        await supabase.from("services").delete().eq("vendor_id", currentVendorId);
        const validServices = services.filter((s) => s.name.trim());
        if (validServices.length > 0) {
          const { error } = await supabase.from("services").insert(
            validServices.map((s) => ({
              vendor_id: currentVendorId!,
              service_name: s.name,
              price: Number(s.price) || 0,
              description: s.description || null,
            }))
          );
          if (error) throw error;
        }
      }

      toast.success("Profil berhasil disimpan!");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">ServisAC</span>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Setup Profil Vendor</h1>
          <p className="text-muted-foreground mt-1">Lengkapi data bisnis Anda untuk mulai menerima pesanan.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Informasi Perusahaan</CardTitle>
            <CardDescription>Data dasar bisnis servis AC Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Perusahaan</Label>
                <Input placeholder="Contoh: AC Cool Service" value={companyName} onChange={(e) => { setCompanyName(e.target.value); if (!vendorId) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
              </div>
              <div className="space-y-2">
                <Label>Slug URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/v/</span>
                  <Input placeholder="ac-cool-service" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <Input placeholder="628123456789" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat Lengkap</Label>
              <Textarea placeholder="Masukkan alamat workshop Anda" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />Lokasi Workshop (Peta)</Label>
              <div className="w-full h-64 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Peta akan ditampilkan di sini</p>
                  <p className="text-xs">Integrasi Leaflet.js + OpenStreetMap</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display">Daftar Layanan</CardTitle>
                <CardDescription>Tambahkan layanan yang Anda tawarkan.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addService}><Plus className="h-4 w-4" />Tambah</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="flex gap-3 items-start p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex-1 grid md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama Layanan</Label>
                    <Input placeholder="Cuci AC" value={service.name} onChange={(e) => updateService(service.id, "name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Harga (Rp)</Label>
                    <Input type="number" placeholder="150000" value={service.price} onChange={(e) => updateService(service.id, "price", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Deskripsi</Label>
                    <Input placeholder="Opsional" value={service.description} onChange={(e) => updateService(service.id, "description", e.target.value)} />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeService(service.id)} disabled={services.length <= 1} className="mt-5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Clock className="h-5 w-5" />Jam Operasional</CardTitle>
            <CardDescription>Atur jam buka dan tutup per hari.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <label className="flex items-center gap-2 w-28">
                    <input type="checkbox" checked={schedule[day].active} onChange={(e) => setSchedule({ ...schedule, [day]: { ...schedule[day], active: e.target.checked } })} className="rounded border-border text-primary focus:ring-primary" />
                    <span className={`text-sm font-medium ${schedule[day].active ? "text-foreground" : "text-muted-foreground"}`}>{day}</span>
                  </label>
                  {schedule[day].active ? (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={schedule[day].open} onChange={(e) => setSchedule({ ...schedule, [day]: { ...schedule[day], open: e.target.value } })} className="w-32" />
                      <span className="text-muted-foreground">-</span>
                      <Input type="time" value={schedule[day].close} onChange={(e) => setSchedule({ ...schedule, [day]: { ...schedule[day], close: e.target.value } })} className="w-32" />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Tutup</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorSetup;
