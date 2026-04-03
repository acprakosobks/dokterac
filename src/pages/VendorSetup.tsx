import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wind, Save, Clock, MapPin } from "lucide-react";
import MapPicker from "@/components/MapPicker";
import VendorDocumentUpload from "@/components/VendorDocumentUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MasterService {
  id: string;
  service_name: string;
  sort_order: number;
}

interface VendorServiceState {
  master_service_id: string;
  is_active: boolean;
  price: string;
  description: string;
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

  const [masterServices, setMasterServices] = useState<MasterService[]>([]);
  const [vendorServices, setVendorServices] = useState<VendorServiceState[]>([]);

  const [schedule, setSchedule] = useState<Record<string, { open: string; close: string; active: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d, { open: "08:00", close: "17:00", active: true }]))
  );

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Load master services
  useEffect(() => {
    const loadMaster = async () => {
      const { data } = await supabase
        .from("master_services")
        .select("*")
        .order("sort_order");
      if (data) setMasterServices(data);
    };
    loadMaster();
  }, []);

  // Load vendor data
  useEffect(() => {
    if (!user || masterServices.length === 0) return;
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

        // Load vendor_services
        const { data: vsData } = await supabase
          .from("vendor_services")
          .select("master_service_id, is_active, price, description")
          .eq("vendor_id", vendor.id);

        const vsMap = new Map(
          (vsData || []).map((vs: any) => [vs.master_service_id, vs])
        );

        setVendorServices(
          masterServices.map((ms) => {
            const existing = vsMap.get(ms.id);
            return {
              master_service_id: ms.id,
              is_active: existing ? existing.is_active : true,
              price: existing ? String(existing.price) : "0",
              description: existing?.description || "",
            };
          })
        );
      } else {
        // New vendor - initialize all services as active
        setVendorServices(
          masterServices.map((ms) => ({
            master_service_id: ms.id,
            is_active: true,
            price: "0",
            description: "",
          }))
        );
      }
    };
    loadVendor();
  }, [user, masterServices]);

  const updateVendorService = (masterServiceId: string, field: keyof VendorServiceState, value: any) => {
    setVendorServices((prev) =>
      prev.map((vs) => (vs.master_service_id === masterServiceId ? { ...vs, [field]: value } : vs))
    );
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
          latitude, longitude,
        }).eq("id", vendorId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("vendors").insert({
          user_id: user.id, company_name: companyName, whatsapp_number: whatsapp,
          email, slug, address_full: address, operational_hours: schedule,
          latitude, longitude,
        }).select().single();
        if (error) throw error;
        currentVendorId = data.id;
        setVendorId(data.id);
      }

      // Sync vendor_services: delete old, insert all
      if (currentVendorId) {
        await supabase.from("vendor_services").delete().eq("vendor_id", currentVendorId);
        const rows = vendorServices.map((vs) => ({
          vendor_id: currentVendorId!,
          master_service_id: vs.master_service_id,
          price: Number(vs.price) || 0,
          description: vs.description || null,
          is_active: vs.is_active,
        }));
        if (rows.length > 0) {
          const { error } = await supabase.from("vendor_services").insert(rows);
          if (error) throw error;
        }
      }

      toast.success("Profil berhasil disimpan!");
      navigate("/vendor/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return null;

  const activeCount = vendorServices.filter((vs) => vs.is_active).length;

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
              <p className="text-xs text-muted-foreground">Klik pada peta untuk menandai lokasi workshop Anda.</p>
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Services Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display">Daftar Layanan</CardTitle>
                <CardDescription>Aktifkan layanan yang Anda tawarkan dan atur harga masing-masing.</CardDescription>
              </div>
              <Badge variant="secondary">{activeCount} / {masterServices.length} aktif</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {masterServices.map((ms) => {
              const vs = vendorServices.find((v) => v.master_service_id === ms.id);
              if (!vs) return null;
              return (
                <div
                  key={ms.id}
                  className={`rounded-xl border p-4 transition-all ${vs.is_active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-60"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={vs.is_active}
                        onCheckedChange={(checked) => updateVendorService(ms.id, "is_active", checked)}
                      />
                      <span className={`font-medium ${vs.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                        {ms.service_name}
                      </span>
                    </div>
                  </div>
                  {vs.is_active && (
                    <div className="grid md:grid-cols-2 gap-3 pl-12">
                      <div className="space-y-1">
                        <Label className="text-xs">Harga (Rp)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={vs.price}
                          onChange={(e) => updateVendorService(ms.id, "price", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Deskripsi (opsional)</Label>
                        <Input
                          placeholder="Keterangan tambahan"
                          value={vs.description}
                          onChange={(e) => updateVendorService(ms.id, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Document Upload Section */}
        <VendorDocumentUpload vendorId={vendorId} userId={user?.id || ""} />

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
