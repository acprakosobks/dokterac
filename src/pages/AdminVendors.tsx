import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

interface Vendor {
  id: string;
  company_name: string;
  slug: string;
  whatsapp_number: string;
  email: string | null;
  address_full: string | null;
  is_active: boolean;
  created_at: string;
  operational_hours: any;
  latitude: number | null;
  longitude: number | null;
}

type StatusFilter = "all" | "pending" | "active" | "inactive";

const getVendorStatus = (v: Vendor): "pending" | "active" | "inactive" => {
  // A vendor that was never activated (created as is_active=false and never changed) is "pending"
  // We use a simple heuristic: if is_active is false and created recently or never had bookings
  // For simplicity: is_active=true means active, is_active=false means we check if it looks like it was ever activated
  // Since we don't track "verified" separately, we treat all is_active=false as "pending" (belum diverifikasi)
  // unless we want to distinguish. Let's keep it simple:
  // is_active = true → "active", is_active = false → "pending" (needs verification)
  return v.is_active ? "active" : "pending";
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Belum Diverifikasi", variant: "outline" },
  active: { label: "Aktif", variant: "default" },
  inactive: { label: "Nonaktif", variant: "destructive" },
};

const AdminVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
    if (data) {
      setVendors(data as Vendor[]);
      const { data: bookings } = await supabase.from("bookings").select("vendor_id");
      if (bookings) {
        const counts: Record<string, number> = {};
        bookings.forEach((b) => { counts[b.vendor_id] = (counts[b.vendor_id] || 0) + 1; });
        setBookingCounts(counts);
      }
    }
  };

  const activateVendor = async (vendor: Vendor) => {
    const { error } = await supabase.from("vendors").update({ is_active: true } as any).eq("id", vendor.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: `Vendor "${vendor.company_name}" berhasil diverifikasi & diaktifkan` });
      fetchVendors();
    }
  };

  const deactivateVendor = async (vendor: Vendor) => {
    const { error } = await supabase.from("vendors").update({ is_active: false } as any).eq("id", vendor.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: `Vendor "${vendor.company_name}" dinonaktifkan` });
      fetchVendors();
    }
  };

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.company_name.toLowerCase().includes(search.toLowerCase()) ||
      v.whatsapp_number.includes(search) ||
      (v.email || "").toLowerCase().includes(search.toLowerCase());

    const status = getVendorStatus(v);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = vendors.filter((v) => !v.is_active).length;
  const activeCount = vendors.filter((v) => v.is_active).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Eye className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vendors.length}</p>
              <p className="text-xs text-muted-foreground">Total Vendor</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-orange-400/30 transition" onClick={() => setStatusFilter("pending")}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Belum Diverifikasi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-green-400/30 transition" onClick={() => setStatusFilter("active")}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Vendor Aktif</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle>Manajemen Vendor</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Belum Diverifikasi</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden sm:table-cell">WhatsApp</TableHead>
                  <TableHead className="hidden md:table-cell">Pesanan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => {
                  const status = getVendorStatus(v);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.company_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{v.whatsapp_number}</TableCell>
                      <TableCell className="hidden md:table-cell">{bookingCounts[v.id] || 0}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedVendor(v)} title="Lihat detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {v.is_active ? (
                            <Button size="sm" variant="destructive" onClick={() => deactivateVendor(v)} title="Nonaktifkan">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="default" onClick={() => activateVendor(v)} title="Verifikasi & Aktifkan">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Tidak ada vendor ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Vendor</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Nama:</span><p className="font-medium">{selectedVendor.company_name}</p></div>
                <div><span className="text-muted-foreground">Slug:</span><p className="font-medium">{selectedVendor.slug}</p></div>
                <div><span className="text-muted-foreground">WhatsApp:</span><p className="font-medium">{selectedVendor.whatsapp_number}</p></div>
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{selectedVendor.email || "-"}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span><p className="font-medium">{selectedVendor.address_full || "-"}</p></div>
                <div><span className="text-muted-foreground">Status:</span>
                  <Badge variant={STATUS_CONFIG[getVendorStatus(selectedVendor)].variant} className="mt-1">
                    {STATUS_CONFIG[getVendorStatus(selectedVendor)].label}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Total Pesanan:</span><p className="font-medium">{bookingCounts[selectedVendor.id] || 0}</p></div>
                <div><span className="text-muted-foreground">Bergabung:</span><p className="font-medium">{new Date(selectedVendor.created_at).toLocaleDateString("id-ID")}</p></div>
                <div><span className="text-muted-foreground">Koordinat:</span><p className="font-medium">{selectedVendor.latitude && selectedVendor.longitude ? `${selectedVendor.latitude}, ${selectedVendor.longitude}` : "-"}</p></div>
              </div>

              <div className="pt-3 border-t flex gap-2">
                {selectedVendor.is_active ? (
                  <Button variant="destructive" className="w-full" onClick={() => { deactivateVendor(selectedVendor); setSelectedVendor(null); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Nonaktifkan Vendor
                  </Button>
                ) : (
                  <Button variant="default" className="w-full" onClick={() => { activateVendor(selectedVendor); setSelectedVendor(null); }}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Verifikasi & Aktifkan
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVendors;
