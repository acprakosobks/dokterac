import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wind, MessageCircle, ExternalLink, Calendar, Clock, SortAsc, SortDesc, Settings, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface Booking {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  booking_date: string;
  booking_time: string;
  status: string;
  selected_services: Json;
  created_at: string;
}

type SortField = "booking_date" | "booking_time";

const VendorDashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorSlug, setVendorSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("booking_date");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, slug")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!vendor) {
        navigate("/vendor/setup");
        return;
      }

      setVendorSlug(vendor.slug);

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("booking_date", { ascending: false });

      setBookings(bookingData || []);
      setLoading(false);
    };
    fetchData();
  }, [user, navigate]);

  const sorted = [...bookings].sort((a, b) => {
    const cmp = a[sortField].localeCompare(b[sortField]);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = sortAsc ? SortAsc : SortDesc;

  const getServiceNames = (selected: Json): string[] => {
    if (!Array.isArray(selected)) return [];
    return selected.map((s: any) => s.name || "Layanan").filter(Boolean);
  };

  const getTotal = (selected: Json): number => {
    if (!Array.isArray(selected)) return 0;
    return selected.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Wind className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold text-foreground">ServisAC</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Button variant="ghost" size="sm" className="text-primary">
                <LayoutDashboard className="h-4 w-4" />Dashboard
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/vendor/setup"><Settings className="h-4 w-4" />Pengaturan</Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {vendorSlug && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/v/${vendorSlug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />Lihat Profil
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Kelola pesanan masuk dari pelanggan Anda.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Pesanan", value: stats.total, color: "text-foreground" },
            { label: "Menunggu", value: stats.pending, color: "text-warning" },
            { label: "Dikonfirmasi", value: stats.confirmed, color: "text-primary" },
            { label: "Selesai", value: stats.completed, color: "text-success" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-3xl font-display font-bold ${stat.color} mt-1`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Daftar Pesanan</CardTitle></CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Belum ada pesanan</p>
                <p className="text-sm mt-1">Bagikan link profil Anda untuk mulai menerima booking.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("booking_date")}>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Tanggal{sortField === "booking_date" && <SortIcon className="h-3.5 w-3.5" />}</span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("booking_time")}>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Waktu{sortField === "booking_time" && <SortIcon className="h-3.5 w-3.5" />}</span>
                      </TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.customer_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getServiceNames(booking.selected_services).map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{booking.booking_date}</TableCell>
                        <TableCell>{booking.booking_time}</TableCell>
                        <TableCell className="font-medium">Rp {getTotal(booking.selected_services).toLocaleString("id-ID")}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status] || ""}`}>
                            {STATUS_LABELS[booking.status] || booking.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`https://wa.me/${booking.customer_whatsapp}?text=${encodeURIComponent(`Halo ${booking.customer_name}, pesanan servis AC Anda pada ${booking.booking_date} jam ${booking.booking_time} telah kami terima. Terima kasih!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4" />WhatsApp
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorDashboard;
