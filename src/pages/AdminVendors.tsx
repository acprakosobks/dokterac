import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, CheckCircle, XCircle } from "lucide-react";

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

const AdminVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
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
      // Fetch booking counts
      const { data: bookings } = await supabase.from("bookings").select("vendor_id");
      if (bookings) {
        const counts: Record<string, number> = {};
        bookings.forEach((b) => { counts[b.vendor_id] = (counts[b.vendor_id] || 0) + 1; });
        setBookingCounts(counts);
      }
    }
  };

  const toggleActive = async (vendor: Vendor) => {
    const newStatus = !vendor.is_active;
    const { error } = await supabase.from("vendors").update({ is_active: newStatus } as any).eq("id", vendor.id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: `Vendor ${newStatus ? "diaktifkan" : "dinonaktifkan"}` });
      fetchVendors();
    }
  };

  const filtered = vendors.filter(
    (v) =>
      v.company_name.toLowerCase().includes(search.toLowerCase()) ||
      v.whatsapp_number.includes(search) ||
      (v.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle>Manajemen Vendor</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.company_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{v.whatsapp_number}</TableCell>
                    <TableCell className="hidden md:table-cell">{bookingCounts[v.id] || 0}</TableCell>
                    <TableCell>
                      <Badge variant={v.is_active ? "default" : "destructive"}>
                        {v.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedVendor(v)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={v.is_active ? "destructive" : "default"}
                          onClick={() => toggleActive(v)}
                        >
                          {v.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <Badge variant={selectedVendor.is_active ? "default" : "destructive"} className="mt-1">
                    {selectedVendor.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Total Pesanan:</span><p className="font-medium">{bookingCounts[selectedVendor.id] || 0}</p></div>
                <div><span className="text-muted-foreground">Bergabung:</span><p className="font-medium">{new Date(selectedVendor.created_at).toLocaleDateString("id-ID")}</p></div>
                <div><span className="text-muted-foreground">Koordinat:</span><p className="font-medium">{selectedVendor.latitude && selectedVendor.longitude ? `${selectedVendor.latitude}, ${selectedVendor.longitude}` : "-"}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVendors;
