import { useState } from "react";
import { Link } from "react-router-dom";
import { Wind, MessageCircle, ExternalLink, Calendar, Clock, SortAsc, SortDesc, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const DEMO_BOOKINGS = [
  { id: "1", customer_name: "Budi Santoso", customer_whatsapp: "628111222333", booking_date: "2026-03-28", booking_time: "09:00", status: "pending", services: ["Cuci AC Split"], total: 75000 },
  { id: "2", customer_name: "Siti Aminah", customer_whatsapp: "628222333444", booking_date: "2026-03-28", booking_time: "14:00", status: "confirmed", services: ["Isi Freon", "Perawatan Berkala"], total: 400000 },
  { id: "3", customer_name: "Ahmad Rizki", customer_whatsapp: "628333444555", booking_date: "2026-03-27", booking_time: "10:00", status: "completed", services: ["Bongkar Pasang AC"], total: 350000 },
  { id: "4", customer_name: "Dewi Lestari", customer_whatsapp: "628444555666", booking_date: "2026-03-29", booking_time: "08:00", status: "pending", services: ["Cuci AC Split", "Perawatan Berkala"], total: 225000 },
];

type SortField = "booking_date" | "booking_time";

const VendorDashboard = () => {
  const [sortField, setSortField] = useState<SortField>("booking_date");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...DEMO_BOOKINGS].sort((a, b) => {
    const cmp = a[sortField].localeCompare(b[sortField]);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = sortAsc ? SortAsc : SortDesc;

  const stats = {
    total: DEMO_BOOKINGS.length,
    pending: DEMO_BOOKINGS.filter((b) => b.status === "pending").length,
    confirmed: DEMO_BOOKINGS.filter((b) => b.status === "confirmed").length,
    completed: DEMO_BOOKINGS.filter((b) => b.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar-style header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Wind className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold text-foreground">ServisAC</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Button variant="ghost" size="sm" className="text-primary">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/vendor/setup">
                  <Settings className="h-4 w-4" />
                  Pengaturan
                </Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/v/ac-cool-service" target="_blank">
                <ExternalLink className="h-4 w-4" />
                Lihat Profil
              </Link>
            </Button>
            <Button variant="ghost" size="icon">
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

        {/* Stats */}
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

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Daftar Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground"
                      onClick={() => toggleSort("booking_date")}
                    >
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Tanggal
                        {sortField === "booking_date" && <SortIcon className="h-3.5 w-3.5" />}
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground"
                      onClick={() => toggleSort("booking_time")}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Waktu
                        {sortField === "booking_time" && <SortIcon className="h-3.5 w-3.5" />}
                      </span>
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
                          {booking.services.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{booking.booking_date}</TableCell>
                      <TableCell>{booking.booking_time}</TableCell>
                      <TableCell className="font-medium">Rp {booking.total.toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status]}`}>
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${booking.customer_whatsapp}?text=${encodeURIComponent(`Halo ${booking.customer_name}, pesanan servis AC Anda pada ${booking.booking_date} jam ${booking.booking_time} telah kami terima. Terima kasih!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorDashboard;
