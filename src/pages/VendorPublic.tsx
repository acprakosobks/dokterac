import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Wind, MapPin, Clock, Phone, Mail, CheckCircle2, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface VendorData {
  id: string;
  company_name: string;
  slug: string;
  whatsapp_number: string;
  email: string | null;
  address_full: string | null;
  operational_hours: Record<string, { open: string; close: string; active: boolean }> | null;
}

interface ServiceData {
  id: string;
  service_name: string;
  price: number;
  description: string | null;
}

const VendorPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      if (!slug) return;
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!vendorData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setVendor({
        ...vendorData,
        operational_hours: vendorData.operational_hours as any,
      });

      const { data: svcData } = await supabase
        .from("services")
        .select("*")
        .eq("vendor_id", vendorData.id);
      setServices(svcData || []);
      setLoading(false);
    };
    fetchVendor();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Vendor Tidak Ditemukan</h2>
            <p className="text-muted-foreground mb-6">Halaman vendor yang Anda cari tidak tersedia.</p>
            <Button asChild><Link to="/">Kembali ke Beranda</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[hsl(var(--hero-gradient-from))] to-[hsl(var(--hero-gradient-to))]">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Wind className="h-6 w-6 text-white" />
            <span className="font-display text-lg font-bold text-white">ServisAC</span>
          </Link>
          <div className="pb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">{vendor.company_name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
              {vendor.address_full && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{vendor.address_full}</span>
              )}
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />+{vendor.whatsapp_number}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Layanan Tersedia</h2>
              {services.length === 0 ? (
                <p className="text-muted-foreground">Belum ada layanan yang ditambahkan.</p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <Card key={service.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-5 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <h3 className="font-semibold text-card-foreground">{service.service_name}</h3>
                            {service.description && <p className="text-sm text-muted-foreground mt-1">{service.description}</p>}
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-semibold whitespace-nowrap ml-4">
                          Rp {Number(service.price).toLocaleString("id-ID")}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Lokasi Workshop</h2>
              <div className="w-full h-64 rounded-xl bg-muted border border-border flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Peta lokasi workshop</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg text-card-foreground mb-2">Booking Sekarang</h3>
                <p className="text-sm text-muted-foreground mb-4">Pilih layanan dan jadwalkan kunjungan teknisi.</p>
                <Button className="w-full" size="lg" asChild>
                  <Link to={`/v/${slug}/book`}>Buat Booking<ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>

            {vendor.operational_hours && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-display font-bold text-card-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />Jam Operasional
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(vendor.operational_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{day}</span>
                        <span className={hours.active ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {hours.active ? `${hours.open} - ${hours.close}` : "Tutup"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-display font-bold text-card-foreground mb-1">Hubungi Kami</h3>
                <a href={`https://wa.me/${vendor.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="h-4 w-4" />WhatsApp: +{vendor.whatsapp_number}
                </a>
                {vendor.email && (
                  <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Mail className="h-4 w-4" />{vendor.email}
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPublic;
