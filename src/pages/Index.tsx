import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wind, MapPin, Calendar, Shield, ArrowRight, Star } from "lucide-react";
import heroImage from "@/assets/hero-ac-service.jpg";

const features = [
  {
    icon: Wind,
    title: "Layanan AC Lengkap",
    description: "Cuci AC, isi freon, bongkar pasang, dan perawatan rutin dari teknisi berpengalaman.",
  },
  {
    icon: MapPin,
    title: "Pilih Lokasi di Peta",
    description: "Tentukan lokasi Anda langsung di peta untuk layanan kunjungan yang akurat.",
  },
  {
    icon: Calendar,
    title: "Booking Online Mudah",
    description: "Pilih tanggal, waktu, dan layanan yang diinginkan dalam hitungan menit.",
  },
  {
    icon: Shield,
    title: "Vendor Terpercaya",
    description: "Semua vendor terverifikasi dengan profil lengkap dan ulasan pelanggan.",
  },
];

const steps = [
  { step: "01", title: "Kunjungi Halaman Vendor", description: "Buka link unik vendor atau temukan vendor terdekat." },
  { step: "02", title: "Pilih Layanan", description: "Pilih layanan AC yang Anda butuhkan dari daftar yang tersedia." },
  { step: "03", title: "Atur Jadwal", description: "Tentukan tanggal, waktu, dan lokasi kunjungan di peta." },
  { step: "04", title: "Konfirmasi Booking", description: "Kirim pesanan dan vendor akan segera menghubungi Anda." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Wind className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">ServisAC</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?tab=register">Daftar Vendor</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--hero-gradient-from))] to-[hsl(var(--hero-gradient-to))]" />
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 text-sm text-white/90">
              <Star className="h-4 w-4" />
              Platform Booking Servis AC #1
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Servis AC Mudah,{" "}
              <span className="text-white/80">Cepat & Terpercaya</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg">
              Hubungkan pelanggan dengan teknisi AC profesional. Booking online, pilih lokasi di peta, dan dapatkan layanan terbaik.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="hero" asChild className="text-base px-8 py-6">
                <Link to="/auth?tab=register">
                  Daftar Sebagai Vendor
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="hero-outline" asChild className="text-base px-8 py-6">
                <Link to="/auth">Masuk ke Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="relative">
          <svg viewBox="0 0 1440 80" className="w-full block" preserveAspectRatio="none">
            <path
              d="M0,40 C360,80 720,0 1440,40 L1440,80 L0,80 Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Kenapa Memilih ServisAC?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Platform all-in-one untuk vendor dan pelanggan servis AC.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Cara Booking Servis AC
            </h2>
            <p className="text-muted-foreground text-lg">4 langkah mudah untuk mendapatkan layanan AC terbaik.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
                <div className="text-5xl font-display font-extrabold text-primary/15 mb-3">{s.step}</div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-[hsl(var(--hero-gradient-from))] to-[hsl(var(--hero-gradient-to))] rounded-3xl p-10 md:p-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Siap Bergabung Sebagai Vendor?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Daftarkan bisnis servis AC Anda dan mulai terima pesanan online hari ini.
            </p>
            <Button size="lg" variant="hero" asChild className="text-base px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-xl">
              <Link to="/auth?tab=register">
                Mulai Sekarang — Gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">ServisAC</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} ServisAC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
