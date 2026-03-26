import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Wind, MapPin, Clock, Phone, Mail, CheckCircle2, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Demo data
const DEMO_VENDOR = {
  company_name: "AC Cool Service",
  slug: "ac-cool-service",
  whatsapp_number: "628123456789",
  email: "info@accool.com",
  address_full: "Jl. Sudirman No. 123, Jakarta Selatan",
  operational_hours: {
    Senin: { open: "08:00", close: "17:00", active: true },
    Selasa: { open: "08:00", close: "17:00", active: true },
    Rabu: { open: "08:00", close: "17:00", active: true },
    Kamis: { open: "08:00", close: "17:00", active: true },
    Jumat: { open: "08:00", close: "17:00", active: true },
    Sabtu: { open: "09:00", close: "15:00", active: true },
    Minggu: { open: "00:00", close: "00:00", active: false },
  },
  services: [
    { id: "1", service_name: "Cuci AC Split", price: 75000, description: "Pembersihan menyeluruh unit indoor & outdoor" },
    { id: "2", service_name: "Isi Freon", price: 250000, description: "Pengisian ulang freon R32/R410a" },
    { id: "3", service_name: "Bongkar Pasang AC", price: 350000, description: "Jasa pindah dan pasang kembali unit AC" },
    { id: "4", service_name: "Perawatan Berkala", price: 150000, description: "Pengecekan, pembersihan, dan optimasi performa" },
  ],
};

const VendorPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const vendor = DEMO_VENDOR; // TODO: fetch from DB

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(var(--hero-gradient-from))] to-[hsl(var(--hero-gradient-to))]">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Wind className="h-6 w-6 text-white" />
            <span className="font-display text-lg font-bold text-white">ServisAC</span>
          </Link>
          <div className="pb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
              {vendor.company_name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {vendor.address_full}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                +{vendor.whatsapp_number}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Services */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Layanan Tersedia</h2>
              <div className="space-y-3">
                {vendor.services.map((service) => (
                  <Card key={service.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-5 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-card-foreground">{service.service_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-semibold whitespace-nowrap ml-4">
                        Rp {service.price.toLocaleString("id-ID")}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Book now */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg text-card-foreground mb-2">
                  Booking Sekarang
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pilih layanan dan jadwalkan kunjungan teknisi.
                </p>
                <Button className="w-full" size="lg" asChild>
                  <Link to={`/v/${slug}/book`}>
                    Buat Booking
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-display font-bold text-card-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Jam Operasional
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

            {/* Contact */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-display font-bold text-card-foreground mb-1">Hubungi Kami</h3>
                <a
                  href={`https://wa.me/${vendor.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  WhatsApp: +{vendor.whatsapp_number}
                </a>
                <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-4 w-4" />
                  {vendor.email}
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPublic;
